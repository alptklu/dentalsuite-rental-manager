# Render Deployment Guide

This guide will help you deploy the DentalSuite Rental Manager to Render.

## Prerequisites

1. A Render account (free tier available)
2. Your code pushed to a GitHub repository
3. Basic understanding of environment variables

## Deployment Steps

### 1. Connect Your Repository

1. Log in to [Render](https://render.com)
2. Click "New +" and select "Web Service"
3. Connect your GitHub repository containing this project
4. Select the repository and branch you want to deploy

### 2. Configure the Web Service

Use these settings when creating your web service:

- **Name**: `dentalsuite-rental-manager` (or your preferred name)
- **Environment**: `Node`
- **Build Command**: `chmod +x build.sh && ./build.sh`
- **Start Command**: `npm start`
- **Plan**: `Free` (or upgrade as needed)

### 3. Set Environment Variables

In the Render dashboard, add these environment variables:

- `NODE_ENV`: `production`
- `PORT`: `10000` (Render will set this automatically)
- `JWT_SECRET`: Generate a secure random string (Render can auto-generate this)
- `DATABASE_URL`: This will be automatically set when you create the database

### 4. Create PostgreSQL Database

1. In your Render dashboard, click "New +" and select "PostgreSQL"
2. Use these settings:
   - **Name**: `dentalsuite-db`
   - **Database Name**: `dentalsuite`
   - **User**: `dentalsuite_user`
   - **Plan**: `Free`

3. Once created, the `DATABASE_URL` will be automatically available to your web service

### 5. Deploy

1. Click "Create Web Service"
2. Render will automatically build and deploy your application
3. The build process will:
   - Install dependencies
   - Build the React frontend
   - Start the Node.js server
   - Initialize the PostgreSQL database with required tables
   - Create a default admin user

### 6. Access Your Application

Once deployed, you can access your application at the URL provided by Render (usually `https://your-service-name.onrender.com`).

### Default Login Credentials

The system will automatically create a default admin user:

- **Username**: `admin`
- **Password**: `admin123`
- **Email**: `admin@dentalsuite.com`

**⚠️ Important**: Change the default password immediately after first login!

## Features Available After Deployment

- **Authentication System**: JWT-based login with role-based access control
- **User Management**: Admin can create/manage users with different roles (admin, manager, viewer)
- **Apartment Management**: Create and manage rental apartments
- **Booking System**: Full booking management with date validation
- **Assignment System**: Assign bookings to apartments or temporary accommodations
- **Backup System**: Export/import data functionality
- **Responsive UI**: Works on desktop and mobile devices

## User Roles

- **Admin**: Full system access including user management and backups
- **Manager**: Can manage apartments and bookings
- **Viewer**: Read-only access to dashboard and assignments

## Troubleshooting

### Build Fails
- Check that all dependencies are listed in `package.json`
- Ensure the build script has proper permissions
- Review build logs for specific error messages

### Database Connection Issues
- Verify the PostgreSQL database is created and running
- Check that `DATABASE_URL` environment variable is set
- Ensure the database and web service are in the same region

### Application Won't Start
- Check the server logs in Render dashboard
- Verify all required environment variables are set
- Ensure the health check endpoint `/api/health` is accessible

### Frontend Not Loading
- Verify the build process completed successfully
- Check that the `dist` folder was created during build
- Ensure static file serving is working in production mode

## Support

If you encounter issues:

1. Check the Render service logs
2. Verify all environment variables are correctly set
3. Ensure the PostgreSQL database is running
4. Review the health check endpoint status

## Security Notes

- The application uses JWT tokens for authentication
- Passwords are hashed using bcrypt
- CORS is configured for production
- Rate limiting is enabled to prevent abuse
- All API endpoints (except auth) require authentication

## Scaling

The free tier includes:
- 750 hours of runtime per month
- Automatic sleep after 15 minutes of inactivity
- 100GB bandwidth per month

For production use, consider upgrading to a paid plan for:
- Always-on service
- More resources
- Better performance
- Custom domains 