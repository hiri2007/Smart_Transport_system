import fs from 'fs';
import path from 'path';

const srcDir = path.resolve('src/stitch_ui');
const destDir = path.resolve('public');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

// Global script to inject for navigation & profile header
const authCheckScript = `
<script>
  (function() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user && window.location.pathname !== '/login' && window.location.pathname !== '/') {
      window.location.href = '/login';
    }
  })();
</script>
`;

const commonScript = `
<script>
  document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
      // Update profile name
      const nameEl = document.querySelector('aside span.font-label-md');
      if (nameEl) nameEl.textContent = user.name;
      
      // Update employee ID / role
      const roleEl = document.querySelector('aside span.text-[10px], aside span.text-on-primary-container\\\\/60');
      if (roleEl) roleEl.textContent = user.role + ' (ID: ' + user.employee_id + ')';
    }

    // Fix sidebar links dynamically
    const sidebarLinks = document.querySelectorAll('aside nav a');
    sidebarLinks.forEach(link => {
      const textEl = link.querySelector('span:not(.material-symbols-outlined)');
      if (!textEl) return;
      const text = textEl.textContent.trim().toLowerCase();
      
      if (text.includes('dashboard')) {
        link.setAttribute('href', '/dashboard');
      } else if (text.includes('fleet')) {
        link.setAttribute('href', '/fleet');
      } else if (text.includes('driver')) {
        link.setAttribute('href', '/drivers');
      } else if (text.includes('trip')) {
        link.setAttribute('href', '/trips');
      } else if (text.includes('maintenance')) {
        link.setAttribute('href', '/maintenance');
      } else if (text.includes('fuel') || text.includes('expense')) {
        link.setAttribute('href', '/expenses');
      } else if (text.includes('analytic')) {
        link.setAttribute('href', '/analytics');
      } else if (text.includes('setting')) {
        link.setAttribute('href', '#');
      }
    });

    // Fix active class for sidebar links based on route
    const currentPath = window.location.pathname;
    sidebarLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href && href === currentPath) {
        link.className = "bg-secondary-container text-on-secondary-container rounded-lg mx-2 flex items-center px-4 py-3 gap-3";
      } else {
        link.className = "text-on-primary-container/70 flex items-center px-4 py-3 mx-2 gap-3 hover:bg-secondary/10 transition-all rounded-lg";
      }
    });

    // Fix mobile bottom nav links
    const mobileLinks = document.querySelectorAll('main nav a, body > nav a');
    mobileLinks.forEach(link => {
      const textEl = link.querySelector('span:not(.material-symbols-outlined)');
      if (!textEl) return;
      const text = textEl.textContent.trim().toLowerCase();
      
      if (text.includes('home') || text.includes('dashboard')) {
        link.setAttribute('href', '/dashboard');
      } else if (text.includes('trip')) {
        link.setAttribute('href', '/trips');
      } else if (text.includes('fleet')) {
        link.setAttribute('href', '/fleet');
      } else if (text.includes('alert') || text.includes('notification')) {
        link.setAttribute('href', '#');
      }
    });

    // Wire up sign out if needed
    const nav = document.querySelector('aside nav');
    if (nav) {
      const logoutBtn = document.createElement('a');
      logoutBtn.className = "text-on-primary-container/70 flex items-center px-4 py-3 mx-2 gap-3 hover:bg-red-500/20 hover:text-red-300 transition-all rounded-lg mt-8 cursor-pointer";
      logoutBtn.innerHTML = '<span class="material-symbols-outlined">logout</span><span class="font-label-md text-label-md">Sign Out</span>';
      logoutBtn.addEventListener('click', () => {
        localStorage.clear();
        window.location.href = '/login';
      });
      nav.appendChild(logoutBtn);
    }
  });
</script>
`;

function processFile(filename) {
  let content = fs.readFileSync(path.join(srcDir, filename), 'utf8');

  // Insert authentication check at top of head
  if (filename !== 'login.html' && filename !== 'login_alt.html') {
    content = content.replace('<head>', '<head>' + authCheckScript);
  }

  // Inject common script at the bottom
  if (filename !== 'login.html' && filename !== 'login_alt.html') {
    content = content.replace('</body>', commonScript + '</body>');
  }

  // File specific dynamic page scripts
  if (filename === 'login.html' || filename === 'login_alt.html') {
    content = content.replace('</body>', `
<script>
  document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value || 'password';
        
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });
          const data = await res.json();
          if (res.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            window.location.href = '/dashboard';
          } else {
            alert(data.error || 'Login failed');
          }
        } catch (err) {
          console.error(err);
          alert('Server connection error.');
        }
      });
    }
  });
</script>
</body>`);
  } else if (filename === 'dashboard.html') {
    content = content.replace('</body>', `
<script>
  async function loadDashboard() {
    try {
      // Load Stats
      const statsRes = await fetch('/api/dashboard/stats');
      const stats = await statsRes.ok ? await statsRes.json() : null;
      if (stats) {
        const tiles = document.querySelectorAll('section.grid > div');
        tiles.forEach(tile => {
          const span = tile.querySelector('span');
          if (!span) return;
          const label = span.textContent.trim().toLowerCase();
          const valEl = tile.querySelector('.font-display-lg');
          if (!valEl) return;
          
          if (label.includes('active vehicles')) valEl.textContent = stats.activeVehicles;
          else if (label.includes('available')) valEl.textContent = stats.availableVehicles;
          else if (label.includes('maintenance')) valEl.textContent = stats.maintenanceVehicles;
          else if (label.includes('active trips')) valEl.textContent = stats.activeTrips;
          else if (label.includes('pending')) valEl.textContent = stats.pendingTrips;
          else if (label.includes('utilization')) valEl.textContent = stats.utilization;
        });
      }

      // Load active trips list
      const tripsRes = await fetch('/api/trips');
      const trips = await tripsRes.json();
      const activeTripsList = trips.filter(t => t.status !== 'Completed');
      
      const tripContainer = document.querySelector('main .lg\\\\:col-span-2 > div.space-y-2');
      if (tripContainer) {
        tripContainer.innerHTML = '';
        if (activeTripsList.length === 0) {
          tripContainer.innerHTML = '<div class="p-8 text-center text-outline text-body-md bg-white border border-outline-variant rounded-lg">No active trips at the moment.</div>';
        }
        activeTripsList.forEach(t => {
          let badgeColor = 'bg-green-100 text-green-800';
          if (t.status === 'Delayed') badgeColor = 'bg-red-100 text-red-800';
          if (t.status === 'Loading') badgeColor = 'bg-blue-100 text-blue-800';

          tripContainer.innerHTML += \`
            <div class="bg-white border border-outline-variant p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-sm transition-shadow">
              <div class="flex items-center gap-4">
                <div class="w-10 h-10 rounded-full bg-secondary-container/10 flex items-center justify-center text-secondary">
                  <span class="material-symbols-outlined">local_shipping</span>
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-data-mono text-data-mono text-primary">#\${t.trip_number}</span>
                    <span class="text-[10px] text-outline">•</span>
                    <span class="font-body-sm text-body-sm text-on-surface-variant font-semibold">\${t.vehicle_name}</span>
                  </div>
                  <div class="flex items-center gap-2 mt-1">
                    <span class="material-symbols-outlined text-[14px] text-outline">person</span>
                    <span class="text-body-sm text-outline">\${t.driver_name}</span>
                  </div>
                </div>
              </div>
              <div class="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto border-t sm:border-none pt-3 sm:pt-0">
                <div class="flex flex-col items-end">
                  <span class="\${badgeColor} px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider">\${t.status}</span>
                  <span class="text-[10px] text-outline mt-1">\${t.notes}</span>
                </div>
                <div class="text-right">
                  <span class="font-label-md text-label-md text-outline block uppercase">ETA</span>
                  <span class="font-data-mono text-data-mono text-primary">\${t.eta}</span>
                </div>
              </div>
            </div>
          \`;
        });
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    }
  }
  document.addEventListener('DOMContentLoaded', loadDashboard);
</script>
</body>`);
  } else if (filename === 'trips.html') {
    content = content.replace('</body>', `
<script>
  let activeTripId = 1; // Default fallback for complete logs

  async function loadTripDispatcher() {
    try {
      // 1. Fetch available vehicles and drivers
      const fleetRes = await fetch('/api/fleet');
      const vehicles = await fleetRes.json();
      const driverRes = await fetch('/api/drivers');
      const drivers = await driverRes.json();
      
      const vehicleSelect = document.querySelector('select[class*="border-error"]');
      const driverSelect = document.querySelectorAll('select[class*="border-error"]')[1];
      
      if (vehicleSelect) {
        vehicleSelect.className = "w-full px-4 py-2.5 border border-outline-variant bg-white rounded-lg focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all outline-none appearance-none";
        // Remove error alert
        const errAlert = vehicleSelect.nextElementSibling;
        if (errAlert && errAlert.textContent.includes('Overloaded')) {
          errAlert.style.display = 'none';
        }
        vehicleSelect.innerHTML = vehicles
          .filter(v => v.status === 'Available')
          .map(v => \`<option value="\${v.id}">\${v.make_model} (\${v.plate_number}) - Cap: \${v.capacity_tons}t</option>\`)
          .join('') || '<option value="">No Vehicles Available</option>';
      }

      if (driverSelect) {
        driverSelect.className = "w-full px-4 py-2.5 border border-outline-variant bg-white rounded-lg focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all outline-none appearance-none";
        // Remove error alert
        const errAlert = driverSelect.nextElementSibling;
        if (errAlert && errAlert.textContent.includes('Expired')) {
          errAlert.style.display = 'none';
        }
        driverSelect.innerHTML = drivers
          .filter(d => d.status === 'Active' && d.license_status === 'Active')
          .map(d => \`<option value="\${d.id}">\${d.name} (ID: \${d.employee_id}) - CDL \${d.cdl_class}</option>\`)
          .join('') || '<option value="">No Drivers Available</option>';
      }

      // Update submit button state
      const submitBtn = document.querySelector('button[disabled]');
      if (submitBtn) {
        submitBtn.removeAttribute('disabled');
        submitBtn.className = "px-8 py-2.5 bg-primary text-white hover:bg-secondary rounded-lg font-label-md text-label-md flex items-center gap-2 cursor-pointer";
        
        // Add form submission handler
        submitBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          const vSelect = document.querySelectorAll('select')[0];
          const dSelect = document.querySelectorAll('select')[1];
          const srcInput = document.querySelector('input[value*="Logistics Hub"]');
          const destInput = document.querySelector('input[placeholder*="destination"]');
          
          if (!vSelect.value || !dSelect.value || !destInput.value) {
            alert('Please select vehicle, driver and enter destination.');
            return;
          }

          const response = await fetch('/api/trips', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              vehicle_id: vSelect.value,
              driver_id: dSelect.value,
              source: srcInput.value,
              destination: destInput.value,
              priority: 'High',
              load_type: 'Perishables',
              refrigeration_required: true
            })
          });

          if (response.ok) {
            alert('Trip Dispatched successfully!');
            window.location.href = '/dashboard';
          } else {
            const err = await response.json();
            alert('Dispatch failed: ' + err.error);
          }
        });
      }

      // Fetch active manifest details
      const tripsRes = await fetch('/api/trips');
      const trips = await tripsRes.json();
      const activeTrip = trips.find(t => t.status === 'In Transit' || t.status === 'Delayed');
      if (activeTrip) {
        activeTripId = activeTrip.id;
        // Update manifest card UI
        const durationEl = document.querySelector('main .col-span-12.lg\\\\:col-span-4 .font-headline-sm');
        if (durationEl) durationEl.textContent = activeTrip.duration;
        const detailsEl = document.querySelector('main .col-span-12.lg\\\\:col-span-4 .text-on-surface-variant');
        if (detailsEl) detailsEl.textContent = \`\${activeTrip.distance_miles} Miles via I-35S\`;
        
        const manifestTitle = document.querySelector('main .col-span-12.lg\\\\:col-span-4 h3');
        if (manifestTitle) manifestTitle.textContent = \`Trip Manifest (#\${activeTrip.trip_number})\`;
      }

      // Complete Trip Modal form submission handler
      const finalizeBtn = document.querySelector('#completeTripModal button[class*="bg-secondary"]');
      if (finalizeBtn) {
        finalizeBtn.addEventListener('click', async () => {
          const odometer = document.querySelector('#completeTripModal input[placeholder="42,198"]').value;
          const fuel = document.querySelector('#completeTripModal input[placeholder="34.5"]').value;
          const notes = document.querySelector('#completeTripModal textarea').value;

          if (!odometer || !fuel) {
            alert('Please input odometer reading and fuel consumption.');
            return;
          }

          const res = await fetch(\`/api/trips/\${activeTripId}/complete\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              odometer_end: odometer,
              fuel_consumption_gal: fuel,
              notes
            })
          });

          if (res.ok) {
            alert('Trip finalized successfully!');
            document.getElementById('completeTripModal').classList.add('hidden');
            window.location.href = '/dashboard';
          } else {
            const err = await res.json();
            alert('Finalization failed: ' + err.error);
          }
        });
      }
    } catch (err) {
      console.error(err);
    }
  }
  document.addEventListener('DOMContentLoaded', loadTripDispatcher);
</script>
</body>`);
  } else if (filename === 'fleet.html') {
    content = content.replace('</body>', `
<script>
  async function loadFleet() {
    try {
      const res = await fetch('/api/fleet');
      const vehicles = await res.json();
      
      const tbody = document.querySelector('table tbody');
      if (tbody) {
        tbody.innerHTML = '';
        vehicles.forEach(v => {
          let statusPill = '';
          if (v.status === 'Available') statusPill = '<span class="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-[11px] font-bold uppercase">Available</span>';
          else if (v.status === 'In Transit') statusPill = '<span class="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[11px] font-bold uppercase">In Transit</span>';
          else statusPill = '<span class="px-2 py-0.5 bg-red-100 text-red-800 rounded-full text-[11px] font-bold uppercase">Maintenance</span>';
          
          tbody.innerHTML += \`
            <tr class="hover:bg-surface-container-low transition-colors border-b border-outline-variant/30">
              <td class="px-6 py-4 font-bold font-data-mono text-primary">\${v.plate_number}</td>
              <td class="px-6 py-4 font-semibold">\${v.make_model}</td>
              <td class="px-6 py-4 text-on-surface-variant">\${v.type}</td>
              <td class="px-6 py-4 font-data-mono">\${v.capacity_tons}t</td>
              <td class="px-6 py-4 font-data-mono">\${v.fuel_efficiency_mpg} MPG</td>
              <td class="px-6 py-4">\${statusPill}</td>
              <td class="px-6 py-4">
                <button class="text-secondary hover:underline text-[12px] font-bold uppercase" onclick="showVehicleDrawer(\${v.id})">Details</button>
              </td>
            </tr>
          \`;
        });
      }
    } catch (err) {
      console.error(err);
    }
  }

  window.showVehicleDrawer = async function(id) {
    try {
      const res = await fetch('/api/fleet');
      const list = await res.json();
      const v = list.find(x => x.id === id);
      if (!v) return;
      
      // Update drawer text fields
      const drawer = document.querySelector('aside[class*="fixed right-0"]');
      if (drawer) {
        drawer.classList.remove('translate-x-full');
        drawer.classList.add('translate-x-0');
        
        const title = drawer.querySelector('h3');
        if (title) title.textContent = \`Vehicle Details: \${v.plate_number}\`;
        
        const inputs = drawer.querySelectorAll('input');
        if (inputs.length >= 4) {
          inputs[0].value = v.make_model;
          inputs[1].value = v.type;
          inputs[2].value = v.capacity_tons;
          inputs[3].value = v.status;
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    loadFleet();
    
    // Close drawer handlers
    const closeDrawerBtn = document.querySelector('aside[class*="fixed right-0"] button');
    if (closeDrawerBtn) {
      closeDrawerBtn.addEventListener('click', () => {
        const drawer = document.querySelector('aside[class*="fixed right-0"]');
        if (drawer) {
          drawer.classList.remove('translate-x-0');
          drawer.classList.add('translate-x-full');
        }
      });
    }
  });
</script>
</body>`);
  } else if (filename === 'drivers.html') {
    content = content.replace('</body>', `
<script>
  async function loadDrivers() {
    try {
      const res = await fetch('/api/drivers');
      const drivers = await res.json();
      
      const tbody = document.querySelector('table tbody');
      if (tbody) {
        tbody.innerHTML = '';
        drivers.forEach(d => {
          let statusPill = '';
          if (d.status === 'Active') statusPill = '<span class="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-[11px] font-bold uppercase">Active</span>';
          else if (d.status === 'In Transit') statusPill = '<span class="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[11px] font-bold uppercase">In Transit</span>';
          else statusPill = '<span class="px-2 py-0.5 bg-red-100 text-red-800 rounded-full text-[11px] font-bold uppercase">\${d.status}</span>';
          
          let licensePill = d.license_status === 'Active' 
            ? '<span class="text-green-600 font-bold uppercase text-[11px]">Valid</span>'
            : '<span class="text-red-600 font-bold uppercase text-[11px]">Expired</span>';
            
          tbody.innerHTML += \`
            <tr class="hover:bg-surface-container-low transition-colors border-b border-outline-variant/30">
              <td class="px-6 py-4 font-semibold">\${d.name}</td>
              <td class="px-6 py-4 font-data-mono">TX-\${d.employee_id}</td>
              <td class="px-6 py-4 font-data-mono">\${d.cdl_class}</td>
              <td class="px-6 py-4 font-data-mono">\${d.license_expiry}</td>
              <td class="px-6 py-4">\${licensePill}</td>
              <td class="px-6 py-4">\${statusPill}</td>
              <td class="px-6 py-4">
                <button class="text-secondary hover:underline text-[12px] font-bold uppercase" onclick="showDriverDrawer(\${d.id})">Edit</button>
              </td>
            </tr>
          \`;
        });
      }
    } catch (err) {
      console.error(err);
    }
  }

  window.showDriverDrawer = async function(id) {
    try {
      const res = await fetch('/api/drivers');
      const list = await res.json();
      const d = list.find(x => x.id === id);
      if (!d) return;
      
      const drawer = document.querySelector('aside[class*="fixed right-0"]');
      if (drawer) {
        drawer.classList.remove('translate-x-full');
        drawer.classList.add('translate-x-0');
        
        const title = drawer.querySelector('h3');
        if (title) title.textContent = \`Driver Profile: \${d.name}\`;
        
        const inputs = drawer.querySelectorAll('input, select');
        if (inputs.length >= 4) {
          inputs[0].value = d.name;
          inputs[1].value = d.cdl_class;
          inputs[2].value = d.license_expiry;
          // License Status select
          inputs[3].value = d.license_status;
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    loadDrivers();
    const closeBtn = document.querySelector('aside[class*="fixed right-0"] button');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        const drawer = document.querySelector('aside[class*="fixed right-0"]');
        if (drawer) {
          drawer.classList.remove('translate-x-0');
          drawer.classList.add('translate-x-full');
        }
      });
    }
  });
</script>
</body>`);
  } else if (filename === 'maintenance.html') {
    content = content.replace('</body>', `
<script>
  async function loadMaintenance() {
    try {
      const res = await fetch('/api/maintenance');
      const logs = await res.json();
      
      const tbody = document.querySelector('table tbody');
      if (tbody) {
        tbody.innerHTML = '';
        logs.forEach(l => {
          let badge = '';
          if (l.status === 'Completed') badge = '<span class="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-[11px] font-bold uppercase">Completed</span>';
          else if (l.status === 'In Progress') badge = '<span class="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[11px] font-bold uppercase">In Progress</span>';
          else badge = '<span class="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-[11px] font-bold uppercase">Scheduled</span>';
          
          tbody.innerHTML += \`
            <tr class="hover:bg-surface-container-low transition-colors border-b border-outline-variant/30">
              <td class="px-6 py-4 font-bold font-data-mono text-primary">\${l.vehicle_name}</td>
              <td class="px-6 py-4 font-semibold">\${l.issue}</td>
              <td class="px-6 py-4 font-data-mono">\${l.date_logged}</td>
              <td class="px-6 py-4 font-data-mono">\${l.scheduled_date}</td>
              <td class="px-6 py-4 font-data-mono">\$\${l.cost}</td>
              <td class="px-6 py-4">\${badge}</td>
            </tr>
          \`;
        });
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function initMaintenanceForm() {
    const fleetRes = await fetch('/api/fleet');
    const vehicles = await fleetRes.json();
    const select = document.querySelector('select');
    if (select) {
      select.innerHTML = vehicles.map(v => \`<option value="\${v.id}">\${v.make_model} (\${v.plate_number})</option>\`).join('');
    }
    
    // Add submit button event
    const submitBtn = document.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const vId = document.querySelector('select').value;
        const issue = document.querySelector('textarea').value;
        const date = document.querySelector('input[type="date"]').value;
        const cost = document.querySelector('input[type="number"]').value;
        const status = document.querySelector('select:nth-of-type(2)').value;
        
        if (!issue || !date) {
          alert('Please enter issue description and scheduled date.');
          return;
        }

        const res = await fetch('/api/maintenance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vehicle_id: vId,
            issue,
            scheduled_date: date,
            status,
            cost
          })
        });

        if (res.ok) {
          alert('Maintenance task logged successfully!');
          window.location.reload();
        } else {
          alert('Failed to log task.');
        }
      });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadMaintenance();
    initMaintenanceForm();
  });
</script>
</body>`);
  } else if (filename === 'expenses.html') {
    content = content.replace('</body>', `
<script>
  async function loadExpenses() {
    try {
      const res = await fetch('/api/expenses');
      const expenses = await res.json();
      
      const tbody = document.querySelector('table tbody');
      if (tbody) {
        tbody.innerHTML = '';
        expenses.forEach(e => {
          let badge = '';
          if (e.status === 'Approved') badge = '<span class="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-[11px] font-bold uppercase">Approved</span>';
          else badge = '<span class="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-[11px] font-bold uppercase">Pending</span>';
          
          tbody.innerHTML += \`
            <tr class="hover:bg-surface-container-low transition-colors border-b border-outline-variant/30">
              <td class="px-6 py-4 font-bold text-primary font-data-mono">\${e.reference_no}</td>
              <td class="px-6 py-4 font-semibold">\${e.type}</td>
              <td class="px-6 py-4 text-on-surface-variant">\${e.description}</td>
              <td class="px-6 py-4 font-data-mono">\${e.date}</td>
              <td class="px-6 py-4 font-data-mono font-bold text-primary">\$\${e.amount}</td>
              <td class="px-6 py-4">\${badge}</td>
            </tr>
          \`;
        });
      }
    } catch (err) {
      console.error(err);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadExpenses();
    
    // Wire up new expense logger
    const saveBtn = document.querySelector('button[type="submit"]') || document.querySelector('aside button[class*="bg-primary"]');
    if (saveBtn) {
      saveBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const type = document.querySelector('select').value;
        const amount = document.querySelector('input[type="number"]').value;
        const description = document.querySelector('textarea').value;
        
        if (!amount) {
          alert('Please enter amount.');
          return;
        }

        const res = await fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, amount, description, status: 'Pending' })
        });

        if (res.ok) {
          alert('Expense logged successfully!');
          window.location.reload();
        } else {
          alert('Failed to log expense.');
        }
      });
    }
  });
</script>
</body>`);
  } else if (filename === 'analytics.html') {
    content = content.replace('</body>', `
<script>
  async function loadAnalytics() {
    try {
      const statsRes = await fetch('/api/dashboard/stats');
      const stats = await statsRes.json();
      
      const tripRes = await fetch('/api/trips');
      const trips = await tripRes.json();
      
      const fleetRes = await fetch('/api/fleet');
      const vehicles = await fleetRes.json();
      
      // Update stats displays
      const uEl = document.querySelector('.font-display-lg');
      if (uEl) uEl.textContent = stats.utilization + '%';
      
      // Compute uptime percent
      const activePercent = document.querySelectorAll('section.grid .font-display-lg')[1];
      if (activePercent) activePercent.textContent = stats.activeVehicles;
    } catch (err) {
      console.error(err);
    }
  }
  document.addEventListener('DOMContentLoaded', loadAnalytics);
</script>
</body>`);
  }

  fs.writeFileSync(path.join(destDir, filename), content);
  console.log(`Processed and wrote \${filename} to public/`);
}

function processAll() {
  const files = fs.readdirSync(srcDir);
  files.forEach(f => {
    if (f.endsWith('.html')) {
      processFile(f);
    }
  });
  
  // Create static index.html which redirects to /login
  fs.writeFileSync(path.join(destDir, 'index.html'), `
<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="refresh" content="0; url=/login" />
</head>
<body>
  Redirecting to login...
</body>
</html>
  `);
  console.log('Created index.html redirect.');
}

processAll();
