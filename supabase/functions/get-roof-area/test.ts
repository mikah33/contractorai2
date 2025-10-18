/**
 * Test Script for Google Solar API Integration
 *
 * Usage:
 * 1. Set GOOGLE_MAPS_API_KEY environment variable
 * 2. Run: deno run --allow-env --allow-net test.ts
 */

const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY')

if (!GOOGLE_MAPS_API_KEY) {
  console.error('❌ GOOGLE_MAPS_API_KEY environment variable not set')
  console.log('Set it with: export GOOGLE_MAPS_API_KEY=your_key_here')
  Deno.exit(1)
}

// Test addresses
const testAddresses = [
  '1600 Pennsylvania Avenue NW, Washington, DC',
  '1 Apple Park Way, Cupertino, CA',
  '1600 Amphitheatre Parkway, Mountain View, CA',
  '350 5th Ave, New York, NY 10118' // Empire State Building
]

async function testRoofArea(address: string) {
  console.log(`\n🏠 Testing: ${address}`)
  console.log('─'.repeat(80))

  try {
    // Step 1: Geocode
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`
    const geocodeResponse = await fetch(geocodeUrl)
    const geocodeData = await geocodeResponse.json()

    if (geocodeData.status !== 'OK') {
      console.log(`❌ Geocoding failed: ${geocodeData.status}`)
      return
    }

    const location = geocodeData.results[0].geometry.location
    console.log(`✓ Geocoded: ${location.lat}, ${location.lng}`)

    // Step 2: Solar API
    const solarUrl = `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${location.lat}&location.longitude=${location.lng}&key=${GOOGLE_MAPS_API_KEY}`
    const solarResponse = await fetch(solarUrl)

    if (!solarResponse.ok) {
      console.log(`❌ Solar API error: ${solarResponse.status}`)
      if (solarResponse.status === 404) {
        console.log('   Coverage not available for this address')
      }
      return
    }

    const buildingData = await solarResponse.json()

    // Extract data
    const roofStats = buildingData.solarPotential?.wholeRoofStats
    if (!roofStats) {
      console.log('❌ No roof data available')
      return
    }

    const roofAreaSqMeters = roofStats.areaMeters2
    const roofAreaSqFeet = Math.round(roofAreaSqMeters * 10.764)

    console.log(`✓ Roof Area: ${roofAreaSqFeet.toLocaleString()} sq ft (${roofAreaSqMeters.toFixed(2)} m²)`)
    console.log(`✓ Imagery Date: ${buildingData.imageryDate?.year}-${buildingData.imageryDate?.month}-${buildingData.imageryDate?.day}`)
    console.log(`✓ Max Solar Panels: ${buildingData.solarPotential.maxArrayPanelsCount?.toLocaleString()}`)
    console.log(`✓ Max Array Area: ${buildingData.solarPotential.maxArrayAreaMeters2?.toFixed(2)} m²`)

  } catch (error) {
    console.log(`❌ Error: ${error.message}`)
  }
}

// Run tests
console.log('🚀 Google Solar API Test Suite')
console.log('═'.repeat(80))

for (const address of testAddresses) {
  await testRoofArea(address)
}

console.log('\n✅ Test suite complete!')
console.log(`\n💡 API Usage: ${testAddresses.length} requests = $${(testAddresses.length * 0.075).toFixed(2)}`)
console.log(`   (First 2,666 requests/month are free)`)
