/**
 * Contractor AI Widget Embed Script
 * Version: 1.0.0
 *
 * This script validates subscription status and loads the calculator widget iframe.
 * It performs real-time validation on every widget load to ensure contractor subscription is active.
 */

(function() {
  'use strict';

  // Get widget configuration from script tag attributes
  const script = document.currentScript;
  const widgetKey = script.getAttribute('data-widget-key');
  const calculatorType = script.getAttribute('data-calculator');

  // Validate required attributes
  if (!widgetKey || !calculatorType) {
    console.error('Contractor AI Widget: Missing required attributes (data-widget-key, data-calculator)');
    return;
  }

  // Supabase configuration
  const SUPABASE_URL = 'https://ujhgwcurllkkeouzwvgk.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqaGd3Y3VybGxra2VvdXp3dmdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4NDYyODEsImV4cCI6MjA2MjQyMjI4MX0.kx-Kt3LTWfYQKYjNBxCfZNLBBRQl__rvMcF4sQ3f2pU';
  const WIDGET_BASE_URL = 'https://contractorai.work';

  /**
   * Validates subscription and loads widget
   * Calls the /widget-validate Edge Function to verify:
   * - Widget key exists and is active
   * - Contractor subscription is active
   * - Calculator type is authorized
   * - Domain matches (if domain locking is enabled)
   * - Rate limits are not exceeded
   */
  async function validateAndLoadWidget() {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/widget-validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          widgetKey: widgetKey,
          calculatorType: calculatorType,
          domain: window.location.hostname,
          referer: document.referrer
        })
      });

      const result = await response.json();

      if (result.valid) {
        // Subscription is active - load widget iframe
        loadWidget(result.contractor);
      } else {
        // Subscription validation failed - show error
        showError(result.reason, result.error);
      }
    } catch (error) {
      console.error('Contractor AI Widget: Validation failed', error);
      showError('network_error', 'Failed to validate widget. Please try again later.');
    }
  }

  /**
   * Creates and mounts the widget iframe
   * @param {Object} contractor - Contractor information from validation response
   */
  function loadWidget(contractor) {
    const container = document.getElementById('contractor-ai-widget');
    if (!container) {
      console.error('Contractor AI Widget: Container element #contractor-ai-widget not found');
      return;
    }

    // Create responsive iframe
    const iframe = document.createElement('iframe');
    iframe.src = `${WIDGET_BASE_URL}/widget/${calculatorType}?key=${widgetKey}`;
    iframe.style.width = '100%';
    iframe.style.height = '600px';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '8px';
    iframe.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
    iframe.setAttribute('data-contractor-id', contractor.id);
    iframe.setAttribute('title', `${contractor.business_name} Calculator Widget`);
    iframe.setAttribute('allow', 'clipboard-write');

    container.appendChild(iframe);

    // Listen for cross-origin messages from iframe
    setupMessageListener();
  }

  /**
   * Sets up cross-origin communication listener
   * Listens for lead submission events from the widget iframe
   */
  function setupMessageListener() {
    window.addEventListener('message', function(event) {
      // Verify message origin for security
      if (event.origin !== WIDGET_BASE_URL) return;

      // Handle different message types
      switch (event.data.type) {
        case 'LEAD_SUBMITTED':
          handleLeadSubmission(event.data);
          break;
        case 'WIDGET_RESIZE':
          handleWidgetResize(event.data);
          break;
        default:
          console.log('Contractor AI Widget: Unknown message type', event.data.type);
      }
    });
  }

  /**
   * Handles lead submission event from widget
   * Dispatches custom event for contractor's website to listen to
   * @param {Object} data - Lead submission data
   */
  function handleLeadSubmission(data) {
    console.log('Contractor AI Widget: Lead submitted', data.leadId);

    // Fire custom event for contractor's website integration
    window.dispatchEvent(new CustomEvent('contractorAILeadSubmitted', {
      detail: {
        leadId: data.leadId,
        calculatorType: calculatorType,
        widgetKey: widgetKey,
        timestamp: new Date().toISOString()
      }
    }));
  }

  /**
   * Handles dynamic iframe resizing
   * @param {Object} data - Resize data from iframe
   */
  function handleWidgetResize(data) {
    const container = document.getElementById('contractor-ai-widget');
    if (!container) return;

    const iframe = container.querySelector('iframe');
    if (iframe && data.height) {
      iframe.style.height = `${data.height}px`;
    }
  }

  /**
   * Displays error message when validation fails
   * @param {string} reason - Error reason code
   * @param {string} message - Human-readable error message
   */
  function showError(reason, message) {
    const container = document.getElementById('contractor-ai-widget');
    if (!container) return;

    // Error messages for different failure reasons
    const errorMessages = {
      'invalid_key': {
        title: 'Invalid Widget Key',
        description: message,
        suggestion: 'Please contact the website owner to resolve this issue.'
      },
      'key_disabled': {
        title: 'Widget Disabled',
        description: message,
        suggestion: 'The calculator widget has been temporarily disabled.'
      },
      'subscription_inactive': {
        title: 'Subscription Inactive',
        description: message,
        suggestion: 'Please contact the website owner to renew their subscription.'
      },
      'calculator_not_allowed': {
        title: 'Calculator Not Authorized',
        description: message,
        suggestion: 'This widget key is not authorized for this calculator type.'
      },
      'domain_mismatch': {
        title: 'Domain Not Authorized',
        description: message,
        suggestion: 'This widget is not authorized for this domain.'
      },
      'rate_limited': {
        title: 'Rate Limit Exceeded',
        description: message,
        suggestion: 'Please wait a moment and try again.'
      },
      'network_error': {
        title: 'Connection Error',
        description: message,
        suggestion: 'Please check your internet connection and try again.'
      }
    };

    const errorConfig = errorMessages[reason] || {
      title: 'Widget Unavailable',
      description: message,
      suggestion: 'Please try again later.'
    };

    // Render styled error message
    container.innerHTML = `
      <div style="
        padding: 24px;
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 8px;
        color: #991b1b;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      ">
        <h3 style="
          margin: 0 0 12px 0;
          font-size: 18px;
          font-weight: 600;
          color: #7f1d1d;
        ">
          ${errorConfig.title}
        </h3>
        <p style="
          margin: 0 0 12px 0;
          font-size: 14px;
          line-height: 1.5;
          color: #991b1b;
        ">
          ${errorConfig.description}
        </p>
        <p style="
          margin: 0;
          font-size: 13px;
          line-height: 1.5;
          color: #b91c1c;
        ">
          ${errorConfig.suggestion}
        </p>
      </div>
    `;
  }

  // Initialize widget validation and loading
  validateAndLoadWidget();

})();
