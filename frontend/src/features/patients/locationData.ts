export const COUNTRY_OPTIONS = [{ label: 'India', value: 'India' }];

export const INDIA_STATE_DISTRICTS: Record<string, string[]> = {
  'Tamil Nadu': [
    'Chennai',
    'Coimbatore',
    'Madurai',
    'Tiruchirappalli',
    'Salem',
    'Tirunelveli',
    'Erode',
    'Vellore',
    'Thanjavur',
    'Kanchipuram',
    'Tiruppur',
    'Dindigul',
    'Namakkal',
    'Karur',
    'Theni',
  ],
  Karnataka: [
    'Bengaluru Urban',
    'Bengaluru Rural',
    'Mysuru',
    'Mangaluru',
    'Hubballi',
    'Belagavi',
    'Ballari',
    'Tumakuru',
  ],
  Kerala: [
    'Thiruvananthapuram',
    'Ernakulam',
    'Kozhikode',
    'Thrissur',
    'Kollam',
    'Alappuzha',
    'Palakkad',
    'Kannur',
  ],
  'Andhra Pradesh': [
    'Visakhapatnam',
    'Vijayawada',
    'Guntur',
    'Tirupati',
    'Kurnool',
    'Nellore',
  ],
  Telangana: ['Hyderabad', 'Rangareddy', 'Warangal', 'Karimnagar', 'Nizamabad'],
  Maharashtra: ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Thane', 'Aurangabad'],
  Delhi: ['Central Delhi', 'New Delhi', 'South Delhi', 'North Delhi', 'East Delhi', 'West Delhi'],
  Gujarat: ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Gandhinagar'],
  Rajasthan: ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer'],
  'West Bengal': ['Kolkata', 'Howrah', 'Darjeeling', 'Hooghly', 'North 24 Parganas'],
  'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Varanasi', 'Agra', 'Noida', 'Ghaziabad'],
  Punjab: ['Amritsar', 'Ludhiana', 'Jalandhar', 'Patiala', 'Mohali'],
  Haryana: ['Gurugram', 'Faridabad', 'Panipat', 'Ambala', 'Hisar'],
  Odisha: ['Bhubaneswar', 'Cuttack', 'Puri', 'Rourkela'],
  Bihar: ['Patna', 'Gaya', 'Muzaffarpur', 'Bhagalpur'],
  Assam: ['Kamrup Metropolitan', 'Guwahati', 'Dibrugarh', 'Jorhat'],
  'Madhya Pradesh': ['Bhopal', 'Indore', 'Gwalior', 'Jabalpur'],
  Goa: ['North Goa', 'South Goa'],
  Puducherry: ['Puducherry', 'Karaikal', 'Mahe', 'Yanam'],
};

export const INDIA_STATE_OPTIONS = Object.keys(INDIA_STATE_DISTRICTS)
  .sort((a, b) => a.localeCompare(b))
  .map((state) => ({ label: state, value: state }));

export function districtOptionsForState(state: string) {
  const districts = INDIA_STATE_DISTRICTS[state] || [];
  return districts.map((district) => ({ label: district, value: district }));
}
