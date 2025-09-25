<?php
echo "PHP is working!<br>";
echo "Current time: " . date('Y-m-d H:i:s') . "<br>";
echo "PHP version: " . phpversion() . "<br>";
echo "Request URI: " . $_SERVER['REQUEST_URI'] . "<br>";
echo "Script name: " . $_SERVER['SCRIPT_NAME'] . "<br>";
echo "Document root: " . $_SERVER['DOCUMENT_ROOT'] . "<br>";
echo "Current directory: " . __DIR__ . "<br>";
?>
