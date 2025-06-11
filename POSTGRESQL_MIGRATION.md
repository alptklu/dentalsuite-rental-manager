# PostgreSQL Migration Guide

This guide explains how to migrate your Dental Suite Rental Manager from SQLite to PostgreSQL to fix the data persistence issue on Render.

## 🔍 The Problem

**SQLite Issue on Render**: Render's free plan uses ephemeral storage. When your app goes to sleep and wakes up, all local file data (including SQLite database) is lost.

**Solution**: Use PostgreSQL - Render provides a persistent, free PostgreSQL database service.

## 🚀 Setup Instructions

### Step 1: Create PostgreSQL Database on Render

1. **Log into Render Dashboard**
   - Go to [render.com](https://render.com) and log in
   - Click "New +" → "PostgreSQL"

2. **Configure Database**
   - Name: `dentalsuite-db` (or your preferred name)
   - Database Name: `dentalsuite`
   - User: `dentalsuite_user` (or your preferred username)
   - Region: Choose closest to your web service
   - Plan: **Free** (0 GB RAM, 1 GB Storage)

3. **Get Connection Details**
   - After creation, go to your database dashboard
   - Copy the **External Database URL** (starts with `postgresql://`)
   - This is your `DATABASE_URL`

### Step 2: Update Environment Variables

In your Render web service settings:

1. Go to your web service dashboard
2. Navigate to "Environment" tab
3. Add these environment variables:

```bash
DATABASE_URL=postgresql://username:password@hostname:port/database
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

**Important**: Replace `DATABASE_URL` with the actual External Database URL from Step 1.

### Step 3: Deploy the Updated Code

The codebase has been updated to use PostgreSQL. Simply deploy:

1. **Commit and Push Changes**:
   ```bash
   git add .
   git commit -m "Migrate from SQLite to PostgreSQL"
   git push
   ```

2. **Render Auto-Deploy**: If auto-deploy is enabled, Render will automatically deploy the changes.

3. **Manual Deploy**: If needed, trigger a manual deploy from the Render dashboard.

### Step 4: Verify Migration

1. **Check Logs**: Monitor deployment logs in Render dashboard
2. **Database Initialization**: Look for these success messages:
   ```
   🚀 Starting PostgreSQL migration...
   ✅ Database schema created successfully
   ✅ Default admin user created
   🎉 Migration completed successfully!
   ```

3. **Test Login**: Visit your app and login with:
   - **Username**: `admin`
   - **Password**: `admin123`
   - **⚠️ Important**: Change this password immediately after first login!

## 🔧 Local Development Setup

For local development with PostgreSQL:

### Option 1: Use Local PostgreSQL
```bash
# Install PostgreSQL locally
# Create database
createdb dentalsuite_dev

# Set environment variable
export DATABASE_URL="postgresql://localhost/dentalsuite_dev"

# Run migration
npm run server:migrate

# Start development
npm run dev
```

### Option 2: Use Render's Development Database
```bash
# Use the same DATABASE_URL from Render (not recommended for heavy development)
export DATABASE_URL="your-render-database-url"
npm run dev
```

## 📝 What Changed

### Database Layer
- ✅ **SQLite** → **PostgreSQL**
- ✅ Connection pooling with `pg` library
- ✅ PostgreSQL-specific SQL syntax (`$1, $2` instead of `?`)
- ✅ Boolean handling (PostgreSQL native booleans)
- ✅ Date/timestamp handling optimized for PostgreSQL

### Schema Updates
- ✅ `SERIAL` for auto-incrementing IDs
- ✅ `VARCHAR(255)` for string fields
- ✅ `BOOLEAN` for boolean fields
- ✅ `TIMESTAMP` for date fields
- ✅ Proper foreign key constraints
- ✅ Performance indexes added

### Files Modified
- 📁 `server/database/init.js` - PostgreSQL connection and schema
- 📁 `server/routes/*.js` - Updated SQL queries for PostgreSQL
- 📁 `package.json` - Replaced `sqlite3` with `pg`
- 📁 `server/database/migrate-to-postgres.js` - Migration script

## 🆘 Troubleshooting

### Common Issues

**1. "DATABASE_URL is required" Error**
- Ensure `DATABASE_URL` is set in Render environment variables
- Check the URL format: `postgresql://user:pass@host:port/dbname`

**2. "Connection refused" Error**
- Verify PostgreSQL database is running on Render
- Check if your Render web service is in the same region as the database

**3. "Authentication failed" Error**
- Double-check the database credentials in the URL
- Ensure the database user has proper permissions

**4. "Tables don't exist" Error**
- The migration should run automatically on first start
- Check deployment logs for migration success messages
- If needed, run migration manually (see below)

### Manual Migration

If automatic migration fails:

```bash
# In your Render web service shell or locally with the DATABASE_URL
node server/database/migrate-to-postgres.js
```

### Reset Database (if needed)

```sql
-- Connect to your PostgreSQL database and run:
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

Then redeploy to run migration again.

## 🔒 Security Notes

1. **Change Default Credentials**: 
   - Login with `admin/admin123`
   - Go to Profile → Change Password
   - Use a strong password

2. **JWT Secret**: 
   - Update `JWT_SECRET` environment variable
   - Use a long, random string (32+ characters)

3. **Database Access**: 
   - Never share your `DATABASE_URL`
   - Render's PostgreSQL is protected by default

## 🎉 Benefits After Migration

✅ **Data Persistence**: No more data loss when app sleeps
✅ **Better Performance**: PostgreSQL optimized for web applications  
✅ **Scalability**: Easy to upgrade database plan as you grow
✅ **Reliability**: Automatic backups and high availability
✅ **Production Ready**: Industry-standard database solution

## 📞 Support

If you encounter issues:

1. Check Render logs for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure PostgreSQL database is active in Render dashboard
4. Test database connection from Render shell if available

Your data will now persist between app sleeps! 🎊 