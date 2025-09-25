@extends('layouts.app')

@section('title', 'Dashboard')

@section('content')
<div class="py-12">
    <div class="max-w-7xl mx-auto sm:px-6 lg:px-8">
        <div class="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
            <div class="p-6 text-gray-900 dark:text-gray-100">
                <h1 class="text-2xl font-bold mb-4">Dashboard</h1>
                <p class="text-lg">Welcome to your Laravel + Vite application!</p>

                <!-- Example of how to use your React components -->
                <div id="react-app" class="mt-6">
                    <!-- Your React app will mount here -->
                </div>
            </div>
        </div>
    </div>
</div>
@endsection

@push('scripts')
<script>
    // Example of how to initialize your React app
    console.log('Dashboard page loaded with Vite assets!');

    // You can access your built assets like this:
    // The @vite() directive automatically handles the hashed filenames
    console.log('Vite assets are automatically loaded with correct hashes');
</script>
@endpush
