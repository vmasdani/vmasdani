<?php

namespace App\Http\Controllers\Tools;

use App\Http\Controllers\Controller;
use App\Support\Tools;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ToolsController extends Controller
{
    /**
     * The utilities landing page.
     */
    public function index(): Response
    {
        return Inertia::render('tools/index');
    }

    /**
     * A single tool page. The client runs the tool (or fetches from its run
     * endpoint); this only validates that the slug is a real tool.
     */
    public function show(Request $request, string $tool): Response
    {
        abort_unless(Tools::exists($tool), 404);

        return Inertia::render('tools/'.$tool);
    }
}
