/**
 * Serves a lightweight embed.js script that can be included on external sites
 * Usage: <script src="https://yourdomain.com/embed"></script>
 * Then: <div data-project="project-slug"></div>
 */
export async function loader() {
  // In production, this would be a built/bundled file
  // For now, we'll generate a simple inline script
  const script = `
(function() {
  'use strict';
  
  function initEmbeds() {
    const elements = document.querySelectorAll('[data-project]');
    elements.forEach(function(el) {
      const projectId = el.getAttribute('data-project');
      if (!projectId) return;
      
      // Fetch project data
      fetch('/api/embed/' + projectId)
        .then(function(res) { return res.json(); })
        .then(function(data) {
          // Simple render - in production, use React or a more sophisticated renderer
          el.innerHTML = '<div style="padding: 20px; border: 1px solid #ccc; border-radius: 8px;">' +
            '<h2>' + (data.title || 'Project') + '</h2>' +
            '<p>' + (data.summary || '') + '</p>' +
            '<p><small>Nodes: ' + (data.nodes?.length || 0) + ', Edges: ' + (data.edges?.length || 0) + '</small></p>' +
            '<p><a href="/p/' + projectId + '" target="_blank">View Full Project →</a></p>' +
            '</div>';
        })
        .catch(function(err) {
          el.innerHTML = '<p style="color: red;">Failed to load project</p>';
          console.error('Embed error:', err);
        });
    });
  }
  
  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEmbeds);
  } else {
    initEmbeds();
  }
})();
  `.trim();

  return new Response(script, {
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

