# 🚀 QUICK START CHECKLIST

## ✅ 5-Minute Setup

### Step 1: Create Google Sheet (1 min)
- [ ] Go to [sheets.google.com](https://sheets.google.com)
- [ ] Click **"+ Blank"**
- [ ] Name it: **"Dental Suite Rental Manager"**

### Step 2: Create Sheets (1 min)
- [ ] Rename "Sheet1" to **"Calendar"**
- [ ] Add new sheet: **"Apartments"**
- [ ] Add new sheet: **"Bookings"**
- [ ] Add new sheet: **"Dashboard"**
- [ ] Add new sheet: **"Settings"**

### Step 3: Copy Templates (2 mins)
**Copy these headers into each sheet:**

#### 📅 Calendar Sheet
```
Row 1: Date | Apt-101 | Apt-102 | Apt-103 | Apt-201 | Apt-202
```

#### 🏨 Apartments Sheet
```
Row 1: ID | Name | Type | Capacity | Features | Daily Rate | Contact | Notes | Status | Last Updated
```

#### 📝 Bookings Sheet
```
Row 1: Booking ID | Guest Name | Email | Phone | Apartment | Check-in | Check-out | Nights | Rate | Total | Status | Notes | Created Date
```

#### 🔍 Dashboard Sheet
```
A1: 📊 RENTAL DASHBOARD
A3: Total Apartments: | B3: =COUNTA(Apartments!A:A)-1
A4: Available Today: | B4: =COUNTIF(Calendar!B2:G2,"Available")
A5: Booked Today: | B5: =COUNTIF(Calendar!B2:G2,"Booked")
```

#### ⚙️ Settings Sheet
```
A1: 🔧 SYSTEM SETTINGS
A3: Status Options:
A4: Active
A5: Maintenance
A6: Inactive
A8: Booking Status:
A9: Confirmed
A10: Pending
A11: Cancelled
```

### Step 4: Add Sample Data (1 min)
**Add your apartments to Apartments sheet:**
```
APT-101 | Suite 101 | Standard | 2 | WiFi, Kitchen, AC | 120 | Your Name | Ready | Active | 2024-01-15
APT-102 | Suite 102 | Deluxe | 4 | WiFi, Kitchen, AC, Balcony | 180 | Your Name | Ocean view | Active | 2024-01-15
```

**Add sample booking to Bookings sheet:**
```
BK-001 | Dr. Smith | dr.smith@email.com | 555-1234 | APT-101 | 2024-01-20 | 2024-01-23 | 3 | 120 | 360 | Confirmed | Test booking | 2024-01-15
```

**Add dates to Calendar (today + 30 days):**
```
2024-01-15 | Available | Available | Available | Available | Available
2024-01-16 | Available | Available | Available | Available | Available
... (continue for 30 days)
```

## 🎨 OPTIONAL: Pretty Colors (2 mins)

### Set Up Color Coding:
1. Select Calendar range B2:F32
2. Format → Conditional formatting
3. Add rules:
   - **"Available"** = Green background
   - **"Booked"** = Red background  
   - **"Maintenance"** = Yellow background

### Set Up Dropdowns:
1. Select Calendar B2:F32 → Data → Data validation
2. Criteria: **List of items** → Available, Booked, Maintenance
3. Select Bookings column K → Data validation  
4. Criteria: **List of items** → Confirmed, Pending, Cancelled

## 🎉 YOU'RE DONE!

Your rental management system is ready! 

**What you can do now:**
- ✅ Track apartment availability visually
- ✅ Manage bookings with guest details
- ✅ See occupancy statistics  
- ✅ Search and filter data
- ✅ Share with your team
- ✅ Access from any device

## 🚀 NEXT LEVEL (Optional)

Want automation? Copy the Apps Script code:
1. Extensions → Apps Script
2. Paste the automation code
3. Save and run `setupAutomation()`
4. Get automatic conflict detection, email notifications, and more!

---

**🎊 Congratulations! You now have a professional rental management system that's:**
- ✅ **Free forever**
- ✅ **Always backed up** 
- ✅ **Works on mobile**
- ✅ **Shareable with team**
- ✅ **No technical maintenance**

**Much better than the complex web app! 🙌** 