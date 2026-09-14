<?php

use App\Support\NetworkService;
use Illuminate\Support\Facades\Process;

it('parses ping statistics from command output', function () {
    $output = <<<'OUT'
        PING example.com (93.184.216.34) 56(84) bytes of data.
        64 bytes from 93.184.216.34: icmp_seq=1 ttl=56 time=20.1 ms
        64 bytes from 93.184.216.34: icmp_seq=2 ttl=56 time=19.8 ms

        --- example.com ping statistics ---
        2 packets transmitted, 2 received, 0% packet loss, time 1001ms
        rtt min/avg/max/mdev = 19.821/19.978/20.135/0.157 ms
        OUT;

    Process::fake(fn () => Process::result(output: $output));

    $result = NetworkService::ping('example.com', 2, 1);

    expect($result['ok'])->toBeTrue()
        ->and($result['resolved'])->toBe('93.184.216.34')
        ->and($result['packets']['transmitted'])->toBe(2)
        ->and($result['packets']['received'])->toBe(2)
        ->and($result['packets']['percentLoss'])->toBe('0')
        ->and($result['timing']['avg'])->toBe('19.978');
});

it('marks a ping with no replies as unreachable', function () {
    Process::fake(fn () => Process::result(
        output: 'PING 10.255.255.1 (10.255.255.1) 56(84) bytes of data.',
        errorOutput: '',
        exitCode: 1,
    ));

    $result = NetworkService::ping('10.255.255.1', 1, 1);

    expect($result['ok'])->toBeFalse()
        ->and($result['packets']['received'])->toBe(0);
});

it('scans tcp ports without a binary', function () {
    $server = stream_socket_server('tcp://127.0.0.1:0', $errno, $errstr);

    expect($server)->toBeResource();

    $name = stream_socket_get_name($server, false);
    $open = (int) substr($name, strrpos($name, ':') + 1);

    // Find a definitely-closed neighbour for the closed-state row.
    $closed = null;

    for ($candidate = $open + 1; $candidate <= $open + 64; $candidate++) {
        if (@fsockopen('127.0.0.1', $candidate) === false) {
            $closed = $candidate;

            break;
        }
    }

    expect($closed)->not->toBeNull();

    $result = NetworkService::nmap('127.0.0.1', $open.','.$closed, 'tcp');

    expect($result['ok'])->toBeTrue()
        ->and($result['ports'][0]['port'])->toBe((string) $open)
        ->and($result['ports'][0]['state'])->toBe('open')
        ->and($result['ports'][0]['service'])->toBeString()
        ->and($result['ports'][1]['state'])->toBe('closed')
        ->and($result['output'])->toContain('open')
        ->and($result['error'])->toBeNull();

    fclose($server);
});

it('fails the scan when the host cannot be resolved', function () {
    $result = NetworkService::nmap('this-host-does-not-exist.invalid', '22', 'tcp');

    expect($result['ok'])->toBeFalse()
        ->and($result['ports'])->toBe([])
        ->and($result['error'])->toBe('The host could not be resolved.');
});

it('parses nslookup server and answer addresses', function () {
    $output = <<<'OUT'
        Server:		127.0.0.53
        Address:	127.0.0.53#53

        Non-authoritative answer:
        Name:	example.com
        Address: 93.184.216.34
        Name:	example.com
        Address: 2606:280:220:1:248:1893:25c8:1946
        OUT;

    Process::fake(fn () => Process::result(output: $output));

    $result = NetworkService::nslookup('example.com');

    expect($result['ok'])->toBeTrue()
        ->and($result['server'])->toBe('127.0.0.53')
        ->and($result['addresses'])->toBe(['93.184.216.34', '2606:280:220:1:248:1893:25c8:1946']);
});

it('marks a failed nslookup as unresolved', function () {
    Process::fake(fn () => Process::result(
        output: "Server:\t\t127.0.0.53\nAddress:\t127.0.0.53#53\n\n** server can't find missing.example: NXDOMAIN",
        errorOutput: '',
        exitCode: 1,
    ));

    $result = NetworkService::nslookup('missing.example');

    expect($result['ok'])->toBeFalse()
        ->and($result['addresses'])->toBe([])
        ->and($result['error'])->not->toBeNull();
});
