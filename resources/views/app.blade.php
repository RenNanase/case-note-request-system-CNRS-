<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">

    <title>{{ config('app.name', 'CNRS') }} - @yield('title', 'Dashboard')</title>

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=inter:400,500,600,700" rel="stylesheet" />

    <!-- Vite Assets - This will load your React app with correct hashed filenames -->
    <!-- Load both Laravel CSS and React app -->
    @viteReactRefresh
    @vite(['resources/css/app.css', 'frontend/src/main.tsx'])

    <!-- Additional CSS for specific pages -->
    @stack('styles')
</head>
<body class="font-sans antialiased">
    <div id="root">
        <!-- React app will mount here -->
        <div class="flex items-center justify-center min-h-screen">
            <div class="text-center">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <p class="text-gray-600">Loading CNRS Application...</p>
            </div>
        </div>
    </div>

    <!-- Additional JavaScript for specific pages -->
    @stack('scripts')
</body>
</html>
