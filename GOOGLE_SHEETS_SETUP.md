# 🏨 Dental Suite Rental Manager - Google Sheets Edition

## 🎯 **Why Google Sheets?**

✅ **No hosting costs** - Completely free forever  
✅ **Real-time collaboration** - Multiple users simultaneously  
✅ **Automatic backups** - Never lose your data  
✅ **Works anywhere** - Phone, tablet, computer  
✅ **Easy to customize** - No coding required for basic changes  
✅ **Instant sharing** - Just send a link  

## 📋 **System Overview**

Your rental management system consists of **5 interconnected sheets**:

1. **🗓️ Availability Calendar** - Visual booking grid
2. **🏨 Apartments Database** - All property details
3. **📝 Bookings List** - Reservation management
4. **🔍 Dashboard & Search** - Quick overview and search
5. **⚙️ Settings & Config** - System configuration

## 🚀 **Quick Setup (5 minutes)**

### Step 1: Create the Spreadsheet
1. Go to [sheets.google.com](https://sheets.google.com)
2. Click **"+ Blank"** to create new spreadsheet
3. Name it: **"Dental Suite Rental Manager"**

### Step 2: Set Up the Sheets
**Rename and create these 5 sheets** (tabs at bottom):
- `Calendar` (rename Sheet1)
- `Apartments` 
- `Bookings`
- `Dashboard`
- `Settings`

### Step 3: Apply the Templates
**Copy each template below into the corresponding sheet**

---

## 📊 **Sheet Templates**

### 🗓️ **CALENDAR SHEET**

**Purpose**: Visual availability grid showing all apartments across dates

**Headers (Row 1)**:
```
A1: Date | B1: Apt-101 | C1: Apt-102 | D1: Apt-103 | E1: Apt-201 | F1: Apt-202 | G1: Apt-203
```

**Sample Data (Rows 2-32)**:
```
A2: 2024-01-01 | B2: Available | C2: Booked | D2: Available | E2: Maintenance | F2: Available | G2: Booked
A3: 2024-01-02 | B3: Booked | C3: Booked | D3: Available | E3: Available | F3: Available | G3: Booked
...continue for 30 days
```

**Color Coding**:
- 🟢 **Green**: Available
- 🔴 **Red**: Booked  
- 🟡 **Yellow**: Maintenance
- ⚪ **White**: Not available

---

### 🏨 **APARTMENTS SHEET**

**Purpose**: Complete apartment database with all details

**Headers (Row 1)**:
```
A1: ID | B1: Name | C1: Type | D1: Capacity | E1: Features | F1: Daily Rate | G1: Contact | H1: Notes | I1: Status | J1: Last Updated
```

**Sample Data**:
```
A2: APT-101 | B2: Suite 101 | C2: Standard | D2: 2 | E2: WiFi, Kitchen, AC | F2: $120 | G2: John Smith (555-0101) | H2: Recently renovated | I2: Active | J2: 2024-01-15

A3: APT-102 | B3: Suite 102 | C3: Deluxe | D3: 4 | E3: WiFi, Kitchen, AC, Balcony | F3: $180 | G3: Jane Doe (555-0102) | H3: Ocean view | I3: Active | J3: 2024-01-15

A4: APT-103 | B4: Suite 103 | C4: Standard | D4: 2 | E4: WiFi, Kitchen | F4: $100 | G4: Bob Wilson (555-0103) | H4: Budget option | I4: Active | J4: 2024-01-15
```

---

### 📝 **BOOKINGS SHEET**

**Purpose**: Track all reservations and guest information

**Headers (Row 1)**:
```
A1: Booking ID | B1: Guest Name | C1: Email | D1: Phone | E1: Apartment | F1: Check-in | G1: Check-out | H1: Nights | I1: Rate | J1: Total | K1: Status | L1: Notes | M1: Created Date
```

**Sample Data**:
```
A2: BK-001 | B2: Dr. Smith | C2: dr.smith@email.com | D2: 555-1234 | E2: APT-101 | F2: 2024-01-15 | G2: 2024-01-18 | H2: 3 | I2: $120 | J2: $360 | K2: Confirmed | L2: Early arrival requested | M2: 2024-01-10

A3: BK-002 | B3: Dr. Johnson | C3: johnson@email.com | D3: 555-5678 | E3: APT-102 | F3: 2024-01-20 | G3: 2024-01-25 | H3: 5 | I3: $180 | J3: $900 | K3: Pending | L3: Group booking | M3: 2024-01-12
```

---

### 🔍 **DASHBOARD SHEET**

**Purpose**: Quick overview, search, and key metrics

**Layout**:
```
A1: 📊 RENTAL DASHBOARD | | | | E1: Quick Search
A2: | | | | E2: [Search Box]
A3: Today's Stats | | | | E3: [Search Results]

A5: 📈 SUMMARY STATS
A6: Total Apartments: | B6: =COUNTA(Apartments!A:A)-1
A7: Available Today: | B7: =COUNTIF(Calendar!B2:G2,"Available")
A8: Booked Today: | B8: =COUNTIF(Calendar!B2:G2,"Booked")
A9: Occupancy Rate: | B9: =B8/(B7+B8)*100&"%"

A11: 🗓️ UPCOMING BOOKINGS (Next 7 Days)
A12: Guest | B12: Apartment | C12: Check-in | D12: Check-out
A13: =FILTER(Bookings!B:F, Bookings!F:F>=TODAY(), Bookings!F:F<=TODAY()+7)

A20: 🏨 AVAILABLE APARTMENTS TODAY
A21: Apartment | B21: Type | C21: Rate
A22: =FILTER(Apartments!A:F, ISNUMBER(MATCH(Apartments!A:A,TRANSPOSE(IF(Calendar!B2:G2="Available",Calendar!B1:G1)),0)))
```

---

### ⚙️ **SETTINGS SHEET**

**Purpose**: Configuration and dropdown lists

**Layout**:
```
A1: 🔧 SYSTEM SETTINGS

A3: Apartment Status Options:
A4: Active
A5: Maintenance  
A6: Inactive

A8: Booking Status Options:
A9: Confirmed
A10: Pending
A11: Cancelled
A12: Checked-in
A13: Checked-out

A15: Calendar Status Options:
A16: Available
A17: Booked
A18: Maintenance
A19: Blocked

A21: 🎨 COLOR CODES
A22: Available: Green (#00FF00)
A23: Booked: Red (#FF0000)  
A24: Maintenance: Yellow (#FFFF00)
A25: Blocked: Gray (#808080)
```

---

## 🔧 **Advanced Features Setup**

### Data Validation (Dropdown Lists)

1. **Apartment Status Dropdown**:
   - Select column I in Apartments sheet
   - Data → Data validation
   - Criteria: List from range → Settings!A4:A6

2. **Booking Status Dropdown**:
   - Select column K in Bookings sheet  
   - Data → Data validation
   - Criteria: List from range → Settings!A9:A13

3. **Calendar Status Dropdown**:
   - Select range B2:G32 in Calendar sheet
   - Data → Data validation
   - Criteria: List from range → Settings!A16:A19

### Conditional Formatting (Color Coding)

1. **Calendar Colors**:
   - Select range B2:G32 in Calendar sheet
   - Format → Conditional formatting
   - Add rules:
     - If text is "Available" → Green background
     - If text is "Booked" → Red background  
     - If text is "Maintenance" → Yellow background

2. **Status Colors in Bookings**:
   - Select column K in Bookings sheet
   - Add conditional formatting:
     - "Confirmed" → Green
     - "Pending" → Yellow
     - "Cancelled" → Red

### Formulas for Automation

**Auto-calculate nights** (Bookings sheet, column H):
```
=IF(AND(F2<>"",G2<>""),G2-F2,"")
```

**Auto-calculate total** (Bookings sheet, column J):
```
=IF(AND(H2<>"",I2<>""),H2*I2,"")
```

**Generate Booking ID** (Bookings sheet, column A):
```
="BK-"&TEXT(ROW()-1,"000")
```

---

## 📱 **Mobile-Friendly Tips**

1. **Freeze headers**: View → Freeze → 1 row
2. **Use short column names** for mobile viewing
3. **Create filtered views** for different users
4. **Pin important sheets** to the left

---

## 👥 **Sharing & Permissions**

### For Team Access:
1. Click **"Share"** button (top right)
2. Add team email addresses
3. Set permissions:
   - **Editor**: Can modify data
   - **Commenter**: Can add notes only
   - **Viewer**: Read-only access

### For Guests/Clients:
1. Share specific filtered views
2. Use **"Publish to web"** for read-only calendars
3. Create **"Anyone with link"** for easy sharing

---

## 🔍 **Search & Filter Functions**

### Quick Search Formula:
```
=FILTER(Bookings!A:M, ISNUMBER(SEARCH(E2,Bookings!B:B&Bookings!C:C&Bookings!E:E)))
```

### Find Available Apartments for Date Range:
```
=FILTER(Apartments!A:C, COUNTIFS(Calendar!A:A,">="&DATE1, Calendar!A:A,"<="&DATE2, Calendar!B:G,"Booked")=0)
```

---

## 🚀 **Getting Started**

1. **Copy the templates** above into your sheets
2. **Add your real apartment data** to Apartments sheet
3. **Set up data validation** for dropdowns
4. **Apply conditional formatting** for colors
5. **Add your first booking** to test
6. **Share with your team**

**Your system is ready! 🎉**

This gives you everything you had in the web app, but simpler and more reliable!

---

## 💡 **Pro Tips**

- **Use keyboard shortcuts**: Ctrl+; for today's date
- **Create named ranges** for easier formulas  
- **Use apps script** for advanced automation
- **Regular backups**: File → Download → Excel format
- **Mobile app**: Install Google Sheets app for on-the-go access

Your rental management is now **bulletproof** and **maintenance-free**! 🎊 