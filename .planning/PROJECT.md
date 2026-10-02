# Cineverse

## Overview
Cineverse is a modern, responsive web application for discovering movies. It leverages the TMDB API to fetch movie data, including trending films, genre-specific collections, and actor details. The application features a "For You" recommendation engine that tracks user tastes (genres and actors) locally to curate personalized content.

## Tech Stack
- **Frontend Framework**: React (Vite)
- **Styling**: Vanilla CSS with fluid typography (`clamp()`)
- **Animation**: GSAP and Framer Motion
- **Scrolling**: Locomotive Scroll (Lenis) for smooth scrolling
- **Data**: TMDB API

## Core Features
1. **Dynamic Movie Discovery**: Browse trending, top-rated, and genre-specific movies.
2. **Personalized "For You" Feed**: An intelligent engine tracks clicked actors and genres via `localStorage` to recommend relevant movies.
3. **Smooth Cinematic UI**: GSAP animations, Locomotive Scroll, and Framer Motion 3D effects (like the shimmering logo) provide a premium experience.
4. **Accessible Design**: Honors `prefers-reduced-motion` for accessibility.

## Goals
- Maintain a high-performance, visually stunning interface.
- Expand recommendation capabilities.
- Keep the codebase lightweight without relying on bloated UI libraries.
