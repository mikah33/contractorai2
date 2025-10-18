/**
 * Get Roof Area from Address using Google Solar API
 *
 * This Edge Function:
 * 1. Geocodes address to lat/lng using Google Geocoding API
 * 2. Fetches building insights from Google Solar API
 * 3. Extracts roof area in square feet
 * 4. Returns roof data for calculator
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

interface RoofAreaRequest {
  address: string
}

interface RoofAreaResponse {
  success: boolean
  address?: string
  roofAreaSqFeet?: number
  roofAreaSqMeters?: number
  confidence?: string
  source?: string
  imageryDate?: string
  error?: string
  details?: {
    center: { latitude: number; longitude: number }
    postalCode?: string
    maxArrayAreaMeters2?: number
    panelsCount?: number
  }
}

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { address } = await req.json() as RoofAreaRequest

    if (!address || address.trim().length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Address is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const GOOGLE_MAPS_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY')
    if (!GOOGLE_MAPS_KEY) {
      console.error('GOOGLE_MAPS_API_KEY environment variable not set')
      return new Response(JSON.stringify({
        success: false,
        error: 'API configuration error'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`Geocoding address: ${address}`)

    // Step 1: Geocode address to lat/lng
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_KEY}`
    const geocodeResponse = await fetch(geocodeUrl)
    const geocodeData = await geocodeResponse.json()

    if (geocodeData.status !== 'OK' || !geocodeData.results || geocodeData.results.length === 0) {
      console.error('Geocoding failed:', geocodeData.status)
      return new Response(JSON.stringify({
        success: false,
        error: 'Address not found. Please check the address and try again.'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const location = geocodeData.results[0].geometry.location
    const lat = location.lat
    const lng = location.lng

    console.log(`Geocoded to: ${lat}, ${lng}`)

    // Step 2: Get building insights from Solar API
    const solarUrl = `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${lat}&location.longitude=${lng}&key=${GOOGLE_MAPS_KEY}`
    const solarResponse = await fetch(solarUrl)

    if (!solarResponse.ok) {
      const errorText = await solarResponse.text()
      console.error('Solar API error:', solarResponse.status, errorText)

      // Check if it's a coverage issue
      if (solarResponse.status === 404) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Solar data not available for this address. Coverage may be limited in your area.'
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      return new Response(JSON.stringify({
        success: false,
        error: 'Unable to analyze roof from satellite imagery. Please try a different address.'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const buildingData = await solarResponse.json()

    // Step 3: Extract roof area
    if (!buildingData.solarPotential || !buildingData.solarPotential.wholeRoofStats) {
      console.error('No roof data in Solar API response')
      return new Response(JSON.stringify({
        success: false,
        error: 'Unable to detect roof area for this address.'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const roofStats = buildingData.solarPotential.wholeRoofStats
    const roofAreaSqMeters = roofStats.areaMeters2
    const roofAreaSqFeet = Math.round(roofAreaSqMeters * 10.764) // Convert m² to ft²

    // Format imagery date
    let imageryDateStr = 'Unknown'
    if (buildingData.imageryDate) {
      const { year, month, day } = buildingData.imageryDate
      imageryDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }

    console.log(`Roof area detected: ${roofAreaSqFeet} sq ft (${roofAreaSqMeters.toFixed(2)} m²)`)

    // Step 4: Return comprehensive roof data
    const response: RoofAreaResponse = {
      success: true,
      address: geocodeData.results[0].formatted_address,
      roofAreaSqFeet: roofAreaSqFeet,
      roofAreaSqMeters: Math.round(roofAreaSqMeters * 100) / 100,
      confidence: 'high',
      source: 'google_solar_api',
      imageryDate: imageryDateStr,
      details: {
        center: {
          latitude: buildingData.center?.latitude || lat,
          longitude: buildingData.center?.longitude || lng
        },
        postalCode: buildingData.postalCode,
        maxArrayAreaMeters2: buildingData.solarPotential.maxArrayAreaMeters2,
        panelsCount: buildingData.solarPotential.maxArrayPanelsCount
      }
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: 'An unexpected error occurred. Please try again.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
