<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">

    <title>{{ config('app.name', 'Laravel') }} - @yield('title', 'Dashboard')</title>

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=inter:400,500,600,700" rel="stylesheet" />

    <!-- Vite Assets - This automatically handles hashed filenames -->
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/app.js'])

    <!-- Additional CSS for specific pages -->
    @stack('styles')
</head>
<body class="font-sans antialiased bg-gray-50 dark:bg-gray-900">
    <div id="app">
        <!-- Navigation -->
        <nav class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between h-16">
                    <div class="flex items-center">
                        <a href="{{ url('/') }}" class="flex-shrink-0">
                            <img class="h-8 w-auto" src="{{ asset('cnrs.logo.png') }}" alt="CNRS">
                        </a>
                    </div>

                    <div class="flex items-center space-x-4">
                        @auth
                            <span class="text-gray-700 dark:text-gray-300">
                                Welcome, {{ Auth::user()->name }}
                            </span>
                            <form method="POST" action="{{ route('logout') }}" class="inline">
                                @csrf
                                <button type="submit" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                                    Logout
                                </button>
                            </form>
                        @else
                            <a href="{{ route('login') }}" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                                Login
                            </a>
                        @endauth
                    </div>
                </div>
            </div>
        </nav>

        <!-- Main Content -->
        <main class="py-6">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                @yield('content')
            </div>
        </main>
    </div>

    <!-- Additional JavaScript for specific pages -->
    @stack('scripts')
</body>
</html>
