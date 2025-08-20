RAMS API Documentation

This document provides a comprehensive guide to all the available endpoints for the Registration and Management System (RAMS) backend.

Base URL: https://registration-iccdglobal-fqc5ebegh8awh3b4.israelcentral-01.azurewebsites.net/api
Authentication

Authentication is handled using JSON Web Tokens (JWT). Protected endpoints require an Authorization header with a Bearer token. The JWT payload now includes a role ('admin' or 'registerer') which determines access to certain endpoints.

    Header Format: Authorization: Bearer <your_jwt_token>

Auth Endpoints
1. Admin & Registerer Login

    Endpoint: POST /auth/login

    Description: Authenticates an administrator or registerer and returns a JWT containing their role.

    Protection: Public

    Request Body:

    {
      "username": "user_login",
      "password": "user_password"
    }


    Success Response (200 OK):

    {
      "status": "SUCCESS",
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }


2. Create Initial Admin

    Endpoint: POST /auth/register

    Description: Creates a new user with the 'admin' role. This should ideally be used only for initial setup.

    Protection: Public

Admin User Management

Endpoints for admins to manage "registerer" user accounts for the mobile app.
Registerer Management Endpoints
1. Create a New Registerer

    Endpoint: POST /auth/registerer

    Description: Creates a new user with the 'registerer' role.

    Protection: Protected (Admin role required)

    Request Body:

    {
      "username": "new_registerer_username",
      "password": "strong_password"
    }


    Success Response (201 Created):

    {
      "status": "SUCCESS",
      "message": "Registerer account created successfully.",
      "data": {
        "admin_id": "generated-uuid",
        "username": "new_registerer_username",
        "role": "registerer",
        "status": "active"
      }
    }


2. Update Registerer Status

    Endpoint: PUT /auth/registerer/:id/status

    Description: Updates a registerer's account status to either active or suspended.

    Protection: Protected (Admin role required)

    URL Parameter:

        id: The UUID of the registerer account.

    Request Body:

    {
      "status": "suspended" 
    }


    Success Response (200 OK):

    {
      "status": "SUCCESS",
      "message": "Registerer status updated to suspended.",
      "data": {
        "admin_id": "...",
        "username": "...",
        "status": "suspended"
      }
    }


3. Delete a Registerer

    Endpoint: DELETE /auth/registerer/:id

    Description: Permanently deletes a registerer's account.

    Protection: Protected (Admin role required)

    URL Parameter:

        id: The UUID of the registerer account.

    Success Response (200 OK):

    {
      "status": "SUCCESS",
      "message": "Registerer account deleted successfully."
    }


Check-In (Mobile App)

Endpoints designed for the mobile check-in application. Accessible only by users with the registerer or admin role.
Check-In Endpoints
1. Get Candidate Details for Check-In

    Endpoint: GET /checkin/:invitationId

    Protection: Protected (Registerer or Admin role required)

2. Check-In a Candidate

    Endpoint: POST /checkin/:invitationId

    Protection: Protected (Registerer or Admin role required)

Candidates

Endpoints for managing individual candidates.
Candidate Endpoints
1. Create a New Candidate

    Endpoint: POST /candidates

    Protection: Public

2. Get Filtered List of Candidates

    Endpoint: GET /candidates

    Protection: Protected (Admin role required)

3. Delete a Candidate

    Endpoint: DELETE /candidates/:id

    Protection: Protected (Admin role required)

4. Get Institute Info for Custom Registration

    Endpoint: GET /candidates/register/:token

    Protection: Public

Institutes

Endpoints for managing invited institutes.
Institute Endpoints
1. Get All Institutes

    Endpoint: GET /institutes

    Protection: Protected (Admin role required)

2. Add a New Institute

    Endpoint: POST /institutes

    Protection: Protected (Admin role required)

3. Delete an Institute

    Endpoint: DELETE /institutes/:id

    Protection: Protected (Admin role required)

Invitations

Endpoints for the invitation workflow.
Invitation Endpoints
1. Send Invitations to Candidates

    Endpoint: POST /invitations/send-emails

    Protection: Protected (Admin role required)

2. Confirm an Invitation

    Endpoint: GET /invitations/confirm

    Protection: Public

3. Decline an Invitation

    Endpoint: GET /invitations/decline

    Protection: Public

4. Show QR Code

    Endpoint: GET /invitations/show-qrcode

    Protection: Public

CSV Upload

Endpoint for bulk-uploading candidates.
Upload Endpoint
1. Upload Candidates via CSV

    Endpoint: POST /upload/csv

    Protection: Protected (Admin role required)