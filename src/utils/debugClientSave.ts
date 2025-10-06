// Add this to browser console to debug client save
export const debugClientSave = () => {
  console.log('🔍 CLIENT SAVE DEBUGGER ACTIVE');

  // Intercept Supabase client
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const [url, options] = args;

    if (url.toString().includes('projects')) {
      console.group('🚀 Supabase Request to projects table');
      console.log('URL:', url);
      console.log('Method:', options?.method);

      if (options?.body) {
        try {
          const body = JSON.parse(options.body);
          console.log('📦 Request Body:', body);
          console.log('✅ Has client_id?', 'client_id' in body);
          console.log('💡 client_id value:', body.client_id);
        } catch (e) {
          console.log('Body:', options.body);
        }
      }

      const response = await originalFetch(...args);
      const clone = response.clone();

      try {
        const data = await clone.json();
        console.log('📨 Response:', data);
      } catch (e) {
        console.log('Response (non-JSON):', await clone.text());
      }

      console.groupEnd();
      return response;
    }

    return originalFetch(...args);
  };

  console.log('✅ Debugger installed. Try creating/editing a project now!');
};

// To use in console:
// import('./utils/debugClientSave').then(m => m.debugClientSave());
