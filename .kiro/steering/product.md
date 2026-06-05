# SRI Tools - Product Overview

SRI Tools is a field services and telecom infrastructure management platform. It serves multiple user roles (SRI staff, vendors, clients) to coordinate fiber/telecom construction and maintenance operations.

## Core Capabilities

- **Field Resource Management (FRM)**: Manage technicians, crews, jobs (fiber install, site survey, decommission, preventive maintenance), and assignments for telecom clients (AT&T, Verizon, T-Mobile)
- **Atlas**: Network infrastructure mapping and analysis with AI-powered features
- **Construction Integration**: Construction project tracking and coordination
- **Deployments**: Deployment lifecycle tracking with real-time notifications via SignalR
- **Street Sheets & Punch Lists**: Field documentation, map-based issue tracking, and quality checklists
- **Expense Management**: Employee expense reporting and approval workflows
- **TPS (Third Party Services)**: Budget tracking, city scorecards, metrics, and violations
- **Admin Dashboard**: User approval workflows, system configuration, role management
- **OSP Coordinator & Market Controller**: Operational tracking for outside plant coordinators and market-level oversight
- **Daily Reports & Notifications**: Real-time push notifications and daily field reporting

## User Roles

The application is role-based with distinct dashboards and permissions for:
- SRI internal staff (admins, coordinators)
- Vendors (field crews, technicians)
- Clients (telecom companies)

## Deployment

Hosted on Azure Static Web Apps. The app is a PWA with offline caching and service worker support.
