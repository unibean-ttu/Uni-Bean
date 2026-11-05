/** Campus directions only: no geolocation or location storage. Google Maps handles routing. */
const routeForm = document.getElementById('campus-route-form');
if (routeForm) {
  routeForm.addEventListener('submit', event => {
    event.preventDefault();
    const origin = document.getElementById('campus-origin').value.trim();
    const mode = document.getElementById('campus-travel-mode').value;
    if (!origin) {
      document.getElementById('campus-origin').focus();
      return;
    }
    const permittedModes = ['transit','driving','walking','bicycling'];
    const url = new URL('https://www.google.com/maps/dir/');
    url.searchParams.set('api', '1');
    url.searchParams.set('origin', origin);
    url.searchParams.set('destination', '大同大學 臺北市中山區');
    url.searchParams.set('travelmode', permittedModes.includes(mode) ? mode : 'transit');
    window.open(url.href, '_blank', 'noopener,noreferrer');
  });
}
