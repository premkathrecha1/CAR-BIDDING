

// ── Car Model ────────────────────────────────────────────────
/**
 * @typedef {Object} CarModel
 * @property {number|string} id           - Unique car identifier (Firestore doc ID in prod)
 * @property {number}   numId             - Numeric ID used for photo lookup
 * @property {string}   make              - Car manufacturer (e.g. "BMW")
 * @property {string}   model             - Car model (e.g. "M3 Competition")
 * @property {number}   year              - Manufacturing year
 * @property {number}   mileage           - Odometer reading in km
 * @property {string}   color             - Exterior colour
 * @property {string}   fuel              - Fuel type: Petrol | Diesel | Hybrid | Electric
 * @property {string}   transmission      - Gearbox: Automatic | Manual | PDK
 * @property {string}   condition         - Condition: Excellent | Good | Like New
 * @property {string}   engine            - Engine description
 * @property {string}   power             - Output in hp
 * @property {string}   torque            - Torque in Nm
 * @property {string}   topSpeed          - Top speed in km/h
 * @property {string}   acceleration      - 0–100 km/h time
 * @property {number}   startingBid       - Starting bid in INR
 * @property {number}   currentBid        - Current highest bid in INR
 * @property {number}   endTime           - Auction end timestamp (ms)
 * @property {string}   badge             - HOT | POPULAR | ENDING SOON | NEW | PREMIUM | ""
 * @property {string}   seller            - Seller name
 * @property {string}   location          - City
 * @property {boolean}  verified          - Whether seller is verified
 * @property {string[]} features          - Key feature list
 * @property {string}   history           - Owner and service history text
 */

/**
 * Creates a default/empty CarModel object.
 * @param {Partial<CarModel>} overrides
 * @returns {CarModel}
 */
export function createCarModel(overrides = {}) {
  return {
    id:           null,
    numId:        null,
    make:         "",
    model:        "",
    year:         new Date().getFullYear(),
    mileage:      0,
    color:        "",
    fuel:         "Petrol",
    transmission: "Automatic",
    condition:    "Good",
    engine:       "",
    power:        "",
    torque:       "",
    topSpeed:     "",
    acceleration: "",
    startingBid:  0,
    currentBid:   0,
    endTime:      Date.now() + 86_400_000, // 24 h default
    badge:        "",
    seller:       "",
    location:     "",
    verified:     false,
    features:     [],
    history:      "",
    bidCount:     0,
    ...overrides,
  };
}

// ── User Model ───────────────────────────────────────────────
/**
 * @typedef {Object} UserModel
 * @property {string}  id          - Firebase Auth UID
 * @property {string}  uid         - Firebase Auth UID (alias)
 * @property {string}  name        - Full name
 * @property {string}  email       - Email address
 * @property {string}  phone       - Phone number
 * @property {string}  avatar      - 2-letter initials
 * @property {string}  photoURL    - Google profile photo URL (or null)
 * @property {string}  city        - User's city
 * @property {string}  provider    - "google" | "email"
 * @property {boolean} verified    - Email verified status
 * @property {number}  bidsPlaced  - Total bids placed
 * @property {number}  wonAuctions - Auctions won
 */

/**
 * Creates a default/empty UserModel object.
 * @param {Partial<UserModel>} overrides
 * @returns {UserModel}
 */
export function createUserModel(overrides = {}) {
  return {
    id:          null,
    uid:         null,
    name:        "",
    email:       "",
    phone:       "",
    avatar:      "",
    photoURL:    null,
    city:        "",
    provider:    "email",
    verified:    false,
    bidsPlaced:  0,
    wonAuctions: 0,
    createdAt:   Date.now(),
    ...overrides,
  };
}

// ── Bid Model ────────────────────────────────────────────────
/**
 * @typedef {Object} BidModel
 * @property {string} id           - Unique bid ID (Firestore doc ID in prod)
 * @property {string} userId       - Firebase Auth UID of bidder
 * @property {string} userName     - Display name of bidder
 * @property {number} amount       - Bid amount in INR
 * @property {string} carId        - Firestore car document ID (as string)
 * @property {number} time         - Bid timestamp ms
 * @property {string} [paymentId]  - Razorpay payment ID (after deposit)
 * @property {number} [depositAmount] - Deposit paid in INR
 */

/**
 * Creates a new BidModel object.
 * @param {string} userId
 * @param {string} userName
 * @param {number} amount
 * @param {string} carId
 * @returns {BidModel}
 */
export function createBidModel(userId, userName, amount, carId) {
  return {
    id:       Math.random().toString(36).slice(2) + Date.now().toString(36),
    userId,
    userName,
    amount,
    carId,
    time:     Date.now(),
  };
}

// ── Static Seed Data ─────────────────────────────────────────
/** @type {CarModel[]} Used to seed Firestore on first boot */
export const SEED_CARS = [
  createCarModel({ numId:1, make:"BMW",          model:"M3 Competition",  year:2021, mileage:18400,  color:"Alpine White",   fuel:"Petrol",     transmission:"Automatic",     condition:"Excellent", engine:"3.0L Twin-Turbo I6",     power:"503 hp",  torque:"650 Nm",  topSpeed:"290 km/h", acceleration:"3.9s", startingBid:4200000,  currentBid:5120000,  endTime:Date.now()+10800000, badge:"HOT",         seller:"Premium Auto Group", location:"Mumbai",    verified:true,  features:["Harman Kardon Audio","Carbon Fibre Trim","M Sport Seats","Head-Up Display","Parking Assistant Plus"], history:"1 Owner · Full Service History · No Accidents", bidCount:4 }),
  createCarModel({ numId:2, make:"Toyota",       model:"Land Cruiser VX", year:2020, mileage:34200,  color:"Midnight Black", fuel:"Diesel",     transmission:"Automatic",     condition:"Good",      engine:"4.5L V8 Twin-Turbo D",   power:"261 hp",  torque:"650 Nm",  topSpeed:"210 km/h", acceleration:"8.2s", startingBid:3800000,  currentBid:4480000,  endTime:Date.now()+25200000, badge:"POPULAR",     seller:"CarZone Delhi",      location:"Delhi",     verified:true,  features:["7-Seater","Panoramic Roof","4WD Crawl Control","Ventilated Seats","360° Camera"], history:"2 Owners · Toyota Service History · Minor Repair", bidCount:2 }),
  createCarModel({ numId:3, make:"Porsche",      model:"911 Carrera S",   year:2022, mileage:8900,   color:"Guards Red",     fuel:"Petrol",     transmission:"PDK 8-Speed",   condition:"Like New",  engine:"3.0L Twin-Turbo Flat-6", power:"443 hp",  torque:"530 Nm",  topSpeed:"308 km/h", acceleration:"3.5s", startingBid:8900000,  currentBid:9750000,  endTime:Date.now()+5400000,  badge:"ENDING SOON", seller:"Luxury Rides",       location:"Bangalore", verified:true,  features:["Sport Chrono Package","BOSE Surround","PASM Sport","SportDesign Package","Burmester Audio"], history:"1 Owner · Porsche Approved · 0 Accidents", bidCount:3 }),
  createCarModel({ numId:4, make:"Mercedes-Benz",model:"GLE 450 AMG",     year:2021, mileage:27600,  color:"Selenite Grey",  fuel:"Mild Hybrid",transmission:"9G-Tronic",     condition:"Excellent", engine:"3.0L I6 EQ Boost",       power:"367 hp",  torque:"500 Nm",  topSpeed:"250 km/h", acceleration:"5.7s", startingBid:5800000,  currentBid:6320000,  endTime:Date.now()+43200000, badge:"NEW",         seller:"Star Motors",        location:"Hyderabad", verified:true,  features:["MBUX Infotainment","Burmester 3D Audio","Air Balance","Panoramic Sunroof","Distronic Plus"], history:"1 Owner · MB Service · No Accidents", bidCount:0 }),
  createCarModel({ numId:5, make:"Audi",         model:"RS7 Sportback",   year:2023, mileage:4100,   color:"Nardo Grey",     fuel:"Petrol",     transmission:"Tiptronic 8-Spd",condition:"Like New",  engine:"4.0L V8 TFSI Biturbo",   power:"591 hp",  torque:"800 Nm",  topSpeed:"305 km/h", acceleration:"3.6s", startingBid:9500000,  currentBid:10400000, endTime:Date.now()+18000000, badge:"PREMIUM",     seller:"Quattro World",      location:"Pune",      verified:true,  features:["Bang & Olufsen 3D Sound","Matrix LED","RS Sport Exhaust","Ceramic Brakes","Night Vision"], history:"1 Owner · Audi Approved · 0 Accidents", bidCount:3 }),
  createCarModel({ numId:6, make:"Ford",         model:"Mustang GT500",   year:2020, mileage:11200,  color:"Grabber Blue",   fuel:"Petrol",     transmission:"Tremec 7-Speed", condition:"Excellent", engine:"5.2L Supercharged V8",   power:"760 hp",  torque:"847 Nm",  topSpeed:"290 km/h", acceleration:"3.3s", startingBid:5500000,  currentBid:6140000,  endTime:Date.now()+72000000, badge:"",            seller:"Muscle Car Hub",     location:"Chennai",   verified:false, features:["Track Package","Recaro Seats","Carbon Track Pack","MagneRide","Launch Control"], history:"1 Owner · Track Use Noted · Full Service", bidCount:0 }),
];

/** Demo users for testing without a live backend */
export const SEED_USERS = [
  createUserModel({ id:"u1", uid:"u1", name:"Rahul Sharma", email:"rahul@example.com", phone:"+91 98765 43210", avatar:"RS", city:"Mumbai",    bidsPlaced:12, wonAuctions:3, verified:true  }),
  createUserModel({ id:"u2", uid:"u2", name:"Priya Mehta",  email:"priya@example.com", phone:"+91 87654 32109", avatar:"PM", city:"Delhi",     bidsPlaced:7,  wonAuctions:1, verified:true  }),
  createUserModel({ id:"u3", uid:"u3", name:"Vikram Patel", email:"vikram@example.com",phone:"+91 76543 21098", avatar:"VP", city:"Bangalore", bidsPlaced:19, wonAuctions:5, verified:true  }),
];

/** Simulated bidder names for real-time bid simulation */
export const SIMULATED_BIDDERS = [
  "Arjun K.", "Sneha R.", "Dev P.",    "Kavya M.",
  "Rohan S.", "Ananya T.","Nikhil B.", "Shreya G.",
  "Manish V.","Pooja S.", "Kiran M.",  "Ravi T.",
];

/** Badge colour map used by CarCard and DetailPage */
export const BADGE_STYLES = {
  "HOT":         { bg: "#ef4444", color: "#fff" },
  "POPULAR":     { bg: "#f59e0b", color: "#fff" },
  "ENDING SOON": { bg: "#7c3aed", color: "#fff" },
  "NEW":         { bg: "#10b981", color: "#fff" },
  "PREMIUM":     { bg: "#1d4ed8", color: "#fff" },
};

/** Fallback image shown when an Unsplash URL fails to load */
export const FALLBACK_IMG = "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=900&q=80";

/**
 * Per-car Unsplash photo arrays.
 * Key matches CarModel.numId (1–6).
 */
export const CAR_PHOTOS = {
  1: ["https://images.unsplash.com/photo-1617531653332-bd46c16f7d5e?w=900&q=80","https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=900&q=80","https://images.unsplash.com/photo-1555215695-3004980ad54e?w=900&q=80","https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=900&q=80","https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=900&q=80"],
  2: ["https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=900&q=80","https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=900&q=80","https://images.unsplash.com/photo-1529778873920-4da4926a72c2?w=900&q=80","https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=900&q=80","https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=900&q=80"],
  3: ["https://images.unsplash.com/photo-1611651338412-8403fa6e3599?w=900&q=80","https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?w=900&q=80","https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=900&q=80","https://images.unsplash.com/photo-1555215695-3004980ad54e?w=900&q=80","https://images.unsplash.com/photo-1617531653332-bd46c16f7d5e?w=900&q=80"],
  4: ["https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=900&q=80","https://images.unsplash.com/photo-1617531653332-bd46c16f7d5e?w=900&q=80","https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=900&q=80","https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=900&q=80","https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=900&q=80"],
  5: ["https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?w=900&q=80","https://images.unsplash.com/photo-1611651338412-8403fa6e3599?w=900&q=80","https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=900&q=80","https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=900&q=80","https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=900&q=80"],
  6: ["https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=900&q=80","https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=900&q=80","https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=900&q=80","https://images.unsplash.com/photo-1490750967868-88df5691f2bf?w=900&q=80","https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=900&q=80"],
};
