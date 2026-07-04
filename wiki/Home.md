---
tags: [moc, home]
aliases: [Wiki, Index, MOC]
---

# 🦜 GDG Lorikeets — Wiki

Obsidian knowledge base for the **gdg-lorikeets** repo: an AI platform built to win
**[[Build with AI 2026]]** (GDG Wrocław, 29 Jun – 4 Jul 2026). Open this folder as
an Obsidian vault; each bracketed link below opens a note.

## 🗺️ Map of content

### The mission
- [[Project Overview]] — what this repo is and why
- [[Winning Playbook]] — how we take first place

### Product design (Day 1)
- [[Event Storming]] — model the TRIZ-solver domain before we build
- [[Event Storming — TRIZ Solver.canvas|The board]] — the working canvas
- [[Session Template]] — capture each storming session
- [[Concept Generation Methods]] — TRIZ + SCAMPER pluggable solver (`ai/solver/`)
- [[Backend Architecture]] — service topology fitted to the pipeline

### Hackathon intel
- [[Build with AI 2026]] — the event (6-day agenda, venue, dates)
- [[Hackaton task]] — the assigned problem (TRIZ + a 2nd method, reasoning trail)
- [[Hackaton deliverables]] — per-day artifacts + pitch + rating
- [[Judging Criteria]] — the full rubric (days + pitch + general categories + gate)
- [[Tech Stack]] — the required stack (and the scoring rubric in disguise)
- [[People]] — judges, trainers, organizers
- [[Competitors]] — the other teams

### The eval system
- [[Eval Suite]] — score ourselves the way the judges will
- [[Criterion Zero]] — the pass/fail gate
- [[Scoreboard]] — the runnable 0–100 scorer
- [[WCS]] — deterministic AI-code scoring (web-codegen-scorer)
- [[API Acceptance Eval]] — measure the fullstack backend
- [[MCP Acceptance Eval]] — measure the MCP server (p5.3)
- [[Deploy Reachability Eval]] — measure the live deployment (p5.1)

### Plumbing
- [[GCP Deployment]] — Day-5 Cloud Run + Cloud Build CI/CD (4-service stack)
- [[MCP Server]] — the Day-5 TRIZ MCP server (pytriz, FastMCP)
- [[Discord Integration]] — community-signal scraper

### Reference
- [[Glossary]] — terms and tools
- **Raw data:** `data/` (structured `.jsonl` facts, see `data/README.md`) ·
  `discord/` (server metadata + how to pull full history)

## 🔑 The one thing to remember
Points split **evenly across the 5 workshop days**, and **the judges are the
trainers** ([[People]]). Balance beats specialization, and a live deployment
([[Tech Stack]]) plus a measured AI-quality score ([[WCS]]) are the differentiators.

#moc #hackathon #eval
