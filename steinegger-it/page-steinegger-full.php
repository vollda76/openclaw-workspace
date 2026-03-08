<?php
/*
Template Name: Steinegger IT Full HTML
Template Post Type: page
*/

// Disable WordPress theme styles completely
remove_action('wp_head', 'wp_enqueue_scripts', 1);
remove_action('wp_head', 'wp_print_styles');
remove_action('wp_head', 'wp_print_head_scripts');
remove_action('wp_head', 'wp_generator');
remove_action('wp_head', 'wlwmanifest_link');
remove_action('wp_head', 'rsd_link');
remove_action('wp_head', 'wp_shortlink_wp_head');

// Read the HTML file
$html_file = dirname(__FILE__) . '/steinegger-it/index-v3.html';
if (file_exists($html_file)) {
    echo file_get_contents($html_file);
} else {
    echo '<h1>HTML file not found</h1>';
}
?>
