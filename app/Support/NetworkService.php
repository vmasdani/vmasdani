<?php

namespace App\Support;

use Illuminate\Process\Exceptions\ProcessTimedOutException;
use Illuminate\Support\Facades\Process;

/**
 * Runs the server-side network probes used by the online tools.
 *
 * The host runs on shared hosting with no root access and no network
 * binaries (nmap, speedtest-cli), so the tools are pure PHP/HTTP:
 * - ping/nslookup still shell out to their (always present) coreutils.
 * - the port scanner reproduces an nmap -sT connect scan with async
 *   stream_socket_client calls and stream_select, plus blocking
 *   confirmation and banner grabs.
 *
 * Where a binary is still used, commands are executed through Symfony
 * Process with an argument array, never interpolated into a shell string,
 * so user input cannot inject extra commands. Every invocation is bounded
 * by a hard timeout.
 */
class NetworkService
{
    /**
     * Default scan set, mirroring nmap's top-20 TCP list plus a few common
     * application ports.
     *
     * @var array<int, int>
     */
    private const DEFAULT_PORTS = [20, 21, 22, 23, 25, 53, 80, 110, 111, 135, 139, 143, 443, 445, 993, 995, 1723, 3306, 3389, 5900, 8080, 8443];

    /**
     * Well-known service names for the port table. Unknown ports fall back
     * to /etc/services via getservbyport().
     *
     * @var array<int, string>
     */
    private const PORT_SERVICES = [
        20 => 'ftp-data', 21 => 'ftp', 22 => 'ssh', 23 => 'telnet', 25 => 'smtp',
        53 => 'domain', 69 => 'tftp', 80 => 'http', 110 => 'pop3', 111 => 'rpcbind',
        113 => 'ident', 123 => 'ntp', 135 => 'msrpc', 139 => 'netbios-ssn',
        143 => 'imap', 161 => 'snmp', 389 => 'ldap', 443 => 'https', 445 => 'microsoft-ds',
        465 => 'smtps', 514 => 'syslog', 587 => 'submission', 631 => 'ipp',
        993 => 'imaps', 995 => 'pop3s', 1080 => 'socks', 1433 => 'ms-sql-s',
        1521 => 'oracle', 1723 => 'pptp', 2049 => 'nfs', 2375 => 'docker',
        3000 => 'http-alt', 3128 => 'squid', 3306 => 'mysql', 3389 => 'ms-wbt-server',
        5000 => 'http-alt', 5432 => 'postgresql', 5672 => 'amqp', 5900 => 'vnc',
        6379 => 'redis', 8080 => 'http-proxy', 8443 => 'https-alt', 8888 => 'http-alt',
        9090 => 'http-alt', 9200 => 'elasticsearch', 11211 => 'memcache',
        27017 => 'mongod',
    ];

    /**
     * Ping a host and return parsed statistics.
     *
     * @return array{ok: bool, host: string, resolved: ?string, output: string, packets: array{transmitted: int, received: int, percentLoss: ?string}, timing: ?array{min: ?string, avg: ?string, max: ?string, mdev: ?string}, error: ?string}
     */
    public static function ping(string $host, int $count, int $timeout): array
    {
        $budget = ($count * ($timeout + 1)) + 4;

        $result = self::run(['ping', '-c', (string) $count, '-W', (string) $timeout, $host], $budget);

        $output = trim($result['output']);
        $lines = preg_split('/\r\n|\r|\n/', $output) ?: [];

        $resolved = null;
        foreach ($lines as $line) {
            if (preg_match('/PING\s+\S+\s*\(([^)]+)\)/', $line, $matches)) {
                $resolved = $matches[1];

                break;
            }
        }

        $packets = ['transmitted' => 0, 'received' => 0, 'percentLoss' => null];

        if (preg_match('/(\d+)\s+packets transmitted, (\d+)\s+(?:packets )?received/i', $output, $matches)) {
            $packets['transmitted'] = (int) $matches[1];
            $packets['received'] = (int) $matches[2];
        }

        if (preg_match('/([\d.]+)% packet loss/i', $output, $matches)) {
            $packets['percentLoss'] = $matches[1];
        }

        $timing = null;

        if (preg_match('/=\s*([\d.,-]+)\s*\/\s*([\d.,-]+)\s*\/\s*([\d.,-]+)\s*\/\s*([\d.,-]+)/', $output, $matches)) {
            $timing = [
                'min' => $matches[1],
                'avg' => $matches[2],
                'max' => $matches[3],
                'mdev' => $matches[4],
            ];
        }

        return [
            'ok' => $result['successful'] && $packets['received'] > 0,
            'host' => $host,
            'resolved' => $resolved,
            'output' => $output,
            'packets' => $packets,
            'timing' => $timing,
            'error' => $result['error'],
        ];
    }

    /**
     * Scan TCP ports with pure-PHP connect probes. Raw SYN and nmap-style
     * version probes need raw sockets, so "syn" degrades to a connect scan
     * and "version" grabs service banners on open ports instead.
     *
     * @return array{ok: bool, host: string, output: string, ports: array<int, array{port: string, protocol: string, state: string, service: string}>, error: ?string}
     */
    public static function nmap(string $host, ?string $ports, string $scan): array
    {
        if (filter_var($host, FILTER_VALIDATE_IP)) {
            $ip = $host;
        } else {
            $ip = gethostbyname($host);

            if ($ip === $host) {
                return [
                    'ok' => false,
                    'host' => $host,
                    'output' => '',
                    'ports' => [],
                    'error' => 'The host could not be resolved.',
                ];
            }
        }

        $portNumbers = self::expandPorts($ports ?? implode(',', self::DEFAULT_PORTS));

        $lines = [];
        if ($scan === 'syn') {
            $lines[] = 'Note: SYN scans need raw sockets, unavailable on shared hosting. Running a TCP connect scan.';
        }

        if ($scan === 'version') {
            $lines[] = 'Note: open ports are banner-grabbed instead of nmap version probes.';
        }

        $scanResult = self::scanTcpPorts($ip, $portNumbers, $scan === 'version');

        $lines[] = sprintf('TCP connect scan of %d port(s) on %s:', count($portNumbers), $ip);

        foreach ($scanResult['ports'] as $entry) {
            $lines[] = sprintf('%-9s %-9s %s', $entry['port'].'/tcp', $entry['state'], $entry['service']);
        }

        foreach ($scanResult['banners'] as $port => $banner) {
            $lines[] = sprintf('%-9s banner: %s', $port.'/tcp', $banner);
        }

        return [
            'ok' => true,
            'host' => $host,
            'output' => implode("\n", $lines),
            'ports' => $scanResult['ports'],
            'error' => null,
        ];
    }

    /**
     * Resolve a host with nslookup and return the answer records.
     *
     * @return array{ok: bool, host: string, server: ?string, addresses: array<int, string>, output: string, error: ?string}
     */
    public static function nslookup(string $host): array
    {
        $result = self::run(['nslookup', $host], 10);

        $output = trim($result['output']);

        $server = null;
        if (preg_match('/Server:\s*(\S+)/i', $output, $matches)) {
            $server = $matches[1];
        }

        $answerSection = $output;
        if (preg_match('/authoritative answer:\s*(.*)$/is', $output, $matches)) {
            $answerSection = $matches[1];
        }

        $addresses = [];
        $expectAddress = false;
        foreach (preg_split('/\r\n|\r|\n/', $answerSection) ?: [] as $line) {
            $line = trim($line);

            if (str_starts_with($line, 'Name:')) {
                $expectAddress = true;

                continue;
            }

            if ($expectAddress && preg_match('/^Address:\s*([0-9a-fA-F:.]+)/', $line, $matches)) {
                $addresses[] = $matches[1];

                continue;
            }

            $expectAddress = false;
        }

        $addresses = array_values(array_unique($addresses));

        $error = null;
        if (! $result['successful']) {
            $error = $result['error'] ?: 'The lookup failed.';
        }

        return [
            'ok' => $result['successful'] && $addresses !== [],
            'host' => $host,
            'server' => $server,
            'addresses' => $addresses,
            'output' => $output,
            'error' => $error,
        ];
    }

    /**
     * Execute a binary with fixed arguments. Returns null error on success.
     *
     * @param  array<int, string>  $command
     * @return array{output: string, error: ?string, successful: bool}
     */
    protected static function run(array $command, int $timeoutSeconds): array
    {
        try {
            $process = Process::timeout($timeoutSeconds)->run($command);
        } catch (ProcessTimedOutException) {
            return [
                'output' => '',
                'error' => 'The operation timed out.',
                'successful' => false,
            ];
        } catch (\Throwable $exception) {
            return [
                'output' => '',
                'error' => 'Unable to run the command: '.$exception->getMessage(),
                'successful' => false,
            ];
        }

        if ($process->failed()) {
            return [
                'output' => $process->output(),
                'error' => trim($process->errorOutput()) ?: 'The command exited with an error.',
                'successful' => false,
            ];
        }

        return [
            'output' => $process->output(),
            'error' => null,
            'successful' => true,
        ];
    }

    /**
     * Expand a comma-separated port list with ranges (22,80,8000-8100),
     * deduplicate, sort, and cap the scan at a shared-hosting friendly size.
     *
     * @return list<int>
     */
    protected static function expandPorts(string $spec): array
    {
        $ports = [];

        foreach (explode(',', $spec) as $part) {
            $part = trim($part);

            if ($part === '') {
                continue;
            }

            $bounds = str_contains($part, '-') ? array_map('intval', explode('-', $part, 2)) : [(int) $part, (int) $part];
            [$from, $to] = $bounds;

            if ($from < 1 || $to > 65535 || $from > $to) {
                continue;
            }

            foreach (range($from, min($to, $from + 511)) as $port) {
                $ports[] = $port;
            }
        }

        $ports = array_values(array_unique($ports));
        sort($ports);

        return array_slice($ports, 0, 256);
    }

    /**
     * Open async connect sockets for every port, use stream_select to find
     * the sockets whose handshake completed, then confirm each candidate
     * with a blocking connect: a writable socket can be either accepted or
     * reset, and only a fresh connect tells them apart. Sockets that never
     * complete within the deadline count as filtered.
     *
     * @param  list<int>  $portNumbers
     * @return array{ports: list<array{port: string, protocol: string, state: string, service: string}>, banners: array<int, string>}
     */
    protected static function scanTcpPorts(string $ip, array $portNumbers, bool $grabBanners): array
    {
        $connectDeadline = hrtime(true) + 12_000_000_000;
        $pending = [];
        $states = [];

        foreach ($portNumbers as $port) {
            $socket = @stream_socket_client(
                sprintf('tcp://%s:%d', $ip, $port),
                $errno,
                $errstr,
                3,
                STREAM_CLIENT_CONNECT | STREAM_CLIENT_ASYNC_CONNECT
            );

            if (is_resource($socket)) {
                stream_set_blocking($socket, false);
                $pending[$port] = $socket;
            } else {
                // ECONNREFUSED arrived immediately: no listener.
                $states[$port] = $errno === 111 ? 'closed' : 'filtered';
            }
        }

        $candidates = [];

        while ($pending !== [] && hrtime(true) < $connectDeadline) {
            $read = [];
            $write = array_values($pending);
            $except = [];

            if (stream_select($read, $write, $except, 0, 500_000) === false) {
                break;
            }

            foreach ([...$write, ...$except] as $socket) {
                $port = array_search($socket, $pending, true);

                if ($port !== false) {
                    $candidates[(int) $port] = $socket;
                    unset($pending[$port]);
                }
            }
        }

        $confirmDeadline = hrtime(true) + 20_000_000_000;
        $results = [];

        foreach ($candidates as $port => $socket) {
            fclose($socket);

            if (hrtime(true) > $confirmDeadline) {
                break;
            }

            $verified = @fsockopen($ip, $port, $errno, $errstr, 2);

            if (is_resource($verified)) {
                fclose($verified);
                $results[$port] = 'open';
            } else {
                $results[$port] = 'closed';
            }
        }

        foreach ($pending as $socket) {
            fclose($socket);
        }

        $banners = [];

        if ($grabBanners) {
            foreach ($results as $port => $state) {
                if ($state !== 'open' || hrtime(true) > $confirmDeadline) {
                    continue;
                }

                $banner = self::grabBanner($ip, $port);

                if ($banner !== null) {
                    $banners[$port] = $banner;
                }
            }
        }

        $rows = [];

        foreach ($portNumbers as $port) {
            $state = $results[$port] ?? 'filtered';

            $rows[] = [
                'port' => (string) $port,
                'protocol' => 'tcp',
                'state' => $state,
                'service' => self::portService($port),
            ];
        }

        return ['ports' => $rows, 'banners' => $banners];
    }

    /**
     * Read the greeting banner from a freshly opened connection. Only
     * line-oriented protocols (ssh, ftp, smtp) greet without a request.
     */
    protected static function grabBanner(string $ip, int $port): ?string
    {
        $socket = @fsockopen($ip, $port, $errno, $errstr, 2);

        if (! is_resource($socket)) {
            return null;
        }

        stream_set_timeout($socket, 1);

        $banner = trim((string) fread($socket, 256));
        fclose($socket);

        if ($banner === '') {
            return null;
        }

        return strtok($banner, "\n") ?: $banner;
    }

    /**
     * Resolve the service name shown in the port table.
     */
    protected static function portService(int $port): string
    {
        return self::PORT_SERVICES[$port]
            ?? getservbyport($port, 'tcp')
            ?? 'unknown';
    }
}
