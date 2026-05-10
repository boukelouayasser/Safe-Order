SOFTWARE REQUIREMENTS SPECIFICATION

Project: Safe Order
Safe Order - Algerian E-Commerce Security Platform


1. INTRODUCTION

1.1 Scope
In Algeria, between 30% and 45% of e-commerce orders are never picked up. The merchant alone pays the round-trip delivery fees (500-1,500 DZD per package). Customers sometimes receive non-conforming products. Delivery companies see their warehouses saturated. No systemic solution exists to date.

Safe Order addresses this triple problem: (1) financial accountability via the Smart Deposit Safe Pay, (2) mandatory transparency via Safe Standards, (3) intelligent analysis of return causes via Safe Insights.

1.2 Overview

Safe Pay: Smart deposit paid by the customer before shipping, deducted from the final price at delivery.
Safe Track: Real-time tracking from the store to the customer's door.
Safe Standards: 3 mandatory conditions: real photos, complete description, careful packaging.
Safe Review: Authentic post-reception reviews tied to real transactions.
Safe Insights: AI dashboard with identified return causes and personalized recommendations.
Trust Score: Score 0-100 for the merchant, the customer, and the delivery company.
Risk Flag: Non-pickup risk indicator displayed before shipping.
Safe Academy: Videos, articles, podcasts for Algerian e-merchants.


2. GENERAL DESCRIPTION

2.1 Functions

F01 - Role + Language Selection: Home screen with Merchant or Customer choice. 3 languages: Arabic, French, English.
F02 - Merchant Registration: First name, last name, 1 phone number, email, wilaya (58), municipality, address, delivery companies.
F03 - Safe Standards: 3 conditions checked mandatorily before accessing the dashboard.
F04 - Order Pipeline: 6 categories: Confirmation, Preparation, Dispatch, Delivery, Delivered, Return Processed.
F05 - Smart Badges: Safe Pay / New (call required) / Loyal (direct send) / Risk (Risk Flag).
F06 - Tracking Label Print: PDF slip to stick on the package. D-1 alert if customer remark contains a date.
F07 - Customer Order Sheet: Via unique link (no app, no account): delivery info + Safe Pay + validation.
F08 - Customer Safe Pay: CIB / Dahabia / BaridiMob payment. Deducted from the final price at delivery.
F09 - Customer Safe Track: Step-by-step timeline. Free remark. Feedback after reception.
F10 - Cart + Wallet: Active orders + weekly/monthly history with financial detail.
F11 - Safe Insights: AI analyzes returns: cause + recommendation. Available from 10 orders.
F12 - Statistics: Delivery rate, return rate, best sellers, feedbacks, monthly evolution.


3. FUNCTIONAL REQUIREMENTS

MoSCoW Prioritization: M = Must Have, S = Should Have, C = Could Have. Actor specified in brackets.

--- Merchant Interface ---

FR-01 - Home Page: Role + Language Selection [All]
Description: The user selects their role (Merchant / Customer) and language (AR/FR/EN) applied to the entire session.
Priority: M - First screen of the app
Input > Output: Role + language click > Redirect to the corresponding interface in the chosen language

FR-02 - Merchant Registration [Merchant]
Description: First name, last name, Phone 1 (required), Email, Wilaya, Municipality, Address, delivery companies. Email verification + SMS OTP.
Priority: M - Account creation
Input > Output: Form + OTP > Account created, redirect to Safe Standards

FR-03 - Safe Standards: 3 Conditions [Merchant]
Description: Before any access: check (1) Authentic Photos, (2) Complete Description, (3) Careful Packaging. Dashboard locked without acceptance.
Priority: M - Condition to benefit from Safe Pay
Input > Output: Box checked > Dashboard unlocked, Certified status activated

FR-04 - Dashboard: 6-Category Pipeline [Merchant]
Description: In confirmation, In preparation, In dispatch, In delivery, Delivered, Return processed. Each order carries a badge: Safe Pay / New / Loyal / Risk.
Priority: M - Core of the dashboard
Input > Output: Category click > Order list with details, badge, price, customer info

FR-05 - Tracking Print + Remark Alert [Merchant]
Description: In preparation: PDF tracking slip to stick on the package. If a date is in a customer remark, automatic alert the day before.
Priority: M - Operational preparation
Input > Output: Print click > PDF generated. Date detected > D-1 alert scheduled

FR-06 - Return Processed: Safe Return + Insights [Merchant]
Description: Uncollected order: customer info, Safe Pay status (deposit collected), AI-identified cause + personalized recommendation.
Priority: M - Financial protection + understanding
Input > Output: Uncollected order + delay > Return sheet + AI + Safe Pay status

FR-07 - Statistics [Merchant]
Description: Delivery rate, return rate (vs. previous month), Trust Score + level, best sellers, wilaya breakdown, +/- feedbacks with reasons.
Priority: M - Performance management
Input > Output: History > Dashboard with key indicators

FR-08 - Safe Insights: AI Analysis [Merchant]
Description: Identifies causes: late delivery recommends changing courier. Photo issue, redo. Packaging, improve. Available from 10 orders.
Priority: S - Differentiating added value
Input > Output: Return history + feedbacks > Causes report + recommendations

--- Customer Interface ---

FR-09 - Customer Access via Link [Customer]
Description: Unique link sent by the merchant (WhatsApp/DM). No app to download, no account. Pre-filled product sheet (photo, description, price).
Priority: M - Simplest customer experience
Input > Output: Link click > Order sheet with product, empty customer form

FR-10 - Order Sheet: Delivery Form [Customer]
Description: First name, last name, phone number, delivery company, wilaya, municipality, address, mode (pickup or home), free remark. Info saved for future recognition.
Priority: M - Delivery information collection
Input > Output: Form submitted > Order created, tracking code generated, merchant notification

FR-11 - Safe Pay: Smart Deposit [Customer]
Description: Customer sees: "You pay X DZD now, deducted from the price. You will pay Y DZD at delivery." Payment via CIB / Dahabia / BaridiMob. First 3 orders: mandatory. Loyal customer (same info): optional.
Priority: M - Central protection mechanism
Input > Output: Payment confirmed > Deposit blocked + confirmation + tracking code

FR-12 - Cart: Order Tracking [Customer]
Description: Customer space (identified by phone): all active orders with store, product, status, tracking code. Click Track for detailed Safe Track.
Priority: M - Centralized tracking
Input > Output: Phone number > Real-time active orders list

FR-13 - Safe Track: Step-by-Step Tracking [Customer]
Description: Timeline: Confirmed > In preparation > Handed to courier > En route > Available / Delivered. Date and time at each step. Free remark at any time.
Priority: M - Total journey transparency
Input > Output: Tracking code > Real-time updated timeline

FR-14 - Post-Reception Feedback [Customer]
Description: After Delivered status: 1-5 star rating, criteria (Conforming / Fast Delivery / Good Packaging / Different Color / Damaged), free comment. Impacts Trust Score.
Priority: M - Trust Score engine
Input > Output: Rating + criteria + comment > Feedback published + Trust Score updated

FR-15 - Wallet: Purchase History [Customer]
Description: Weekly / monthly view: store name, product (size, color), store wilaya, status, total price, Safe Pay deposit, delivery fees, remaining to pay.
Priority: S - Customer purchase management
Input > Output: Phone number history > Organized list with financial details

FR-16 - Safe Academy [Merchant]
Description: Integrated YouTube videos, articles, podcasts. Themes: product photos, choosing a courier, avoiding returns, Algerian e-commerce legal aspects.
Priority: C - Acquisition and retention
Input > Output: Topic search > Content list, integrated playback


4. USER INTERFACE REQUIREMENTS

4.1 Software Interfaces

CIB Algeria: Safe Pay payment by Algerian bank card.
Dahabia Card / Algeria Post: CCP payment, widely used in interior wilayas.
BaridiMob: Mobile payment via BaridiMob application.
Yalidine API: Real-time delivery statuses for Safe Track.
ZR Express / Maystro / others: Statuses via API or ethical scraping if no public API.
Firebase Cloud Messaging: Push notifications for iOS and Android.
Twilio / SMS: OTP verification for registration + SMS order alerts.
YouTube Data API v3: Safe Academy video integration in the app.

4.2 Platform Interfaces

Merchant Web App: React.js 18 - Dashboard, pipeline, Safe Insights, stats, Safe Academy.
Customer Web App: React.js 18 - Order sheet, Safe Pay, Safe Track, cart, wallet, feedbacks.
Administrator Portal: React.js - Standards validation, disputes, moderation, global dashboard.

4.3 UX Requirements

Trilingual Arabic / French / English with full RTL support for Arabic.
Maximum 3 clicks to reach any main feature.
Safe Order palette: Navy Blue #0D3B66, Safe Green #0D6E3F, Gold #F0AE1A.


5. NON-FUNCTIONAL ATTRIBUTES

5.1 Usability

5-step onboarding guide for new merchants.
Customer order sheet usable by someone with low digital literacy.
Error messages in Arabic and French, no technical code displayed.
Target SUS score >= 80/100, validated by field testing with 30 Algerian merchants.

5.2 Security

Transit encryption: TLS 1.3 mandatory.
Storage encryption: AES-256 for financial and personal data.
Merchant authentication: JWT 15min + httpOnly Refresh Token + mandatory SMS MFA.
Customer authentication: SMS OTP, no password.
Access control: RBAC 4 levels: Customer / Merchant / Courier / Admin.
Payments: No card data stored, PCI-DSS via CIB/Dahabia.
Compliance: Algerian Law 18-07, personal data on Algerian VPS.
Audit: Complete logging of financial operations, 5-year archiving.

6. SCHEDULE AND BUDGET

6.1 Technology Stack

Code: Github repository, only one repository for frontend and backend.
Frontend web: React.js 18 + TypeScript + Tailwind CSS -> will be hosted using vercel free plan
Backend: python fast api -> will be hosted on railway app
Databases: PostgreSQL -> will be hosted on railway app
Hosting: Github for code, vercel for frontend, railway for backend and database
