import fs from 'fs';
import path from 'path';

const screens = [
  {
    name: 'login.html',
    url: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1NjYzYjFjNzcwZTgwN2M0ZDk2MzkzMzhkYzU2EgsSBxCPpeyk9xIYAZIBIwoKcHJvamVjdF9pZBIVQhMzNTcxNjk3MTYzNDI4MDMzNjIy&filename=&opi=89354086'
  },
  {
    name: 'login_alt.html',
    url: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1NjY0MTMyOTcyYzMwMjA3OWUwM2EyMTQ4NmYzEgsSBxCPpeyk9xIYAZIBIwoKcHJvamVjdF9pZBIVQhMzNTcxNjk3MTYzNDI4MDMzNjIy&filename=&opi=89354086'
  },
  {
    name: 'trips.html',
    url: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1NjYzYjY5YTM5NmIwNGVhYjcyNzVhMjU1YWFjEgsSBxCPpeyk9xIYAZIBIwoKcHJvamVjdF9pZBIVQhMzNTcxNjk3MTYzNDI4MDMzNjIy&filename=&opi=89354086'
  },
  {
    name: 'fleet.html',
    url: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1NjYzYjI5M2ExNWEwN2UwMGU2NDY1MmM3ODg2EgsSBxCPpeyk9xIYAZIBIwoKcHJvamVjdF9pZBIVQhMzNTcxNjk3MTYzNDI4MDMzNjIy&filename=&opi=89354086'
  },
  {
    name: 'analytics.html',
    url: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1NjYzYjY3OWQwZjMwN2M0YzNiZjY3Mzc0NGY0EgsSBxCPpeyk9xIYAZIBIwoKcHJvamVjdF9pZBIVQhMzNTcxNjk3MTYzNDI4MDMzNjIy&filename=&opi=89354086'
  },
  {
    name: 'dashboard.html',
    url: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1NjYzYjMyM2E1MjEwN2M0ZDhlODU4MGU2YWE4EgsSBxCPpeyk9xIYAZIBIwoKcHJvamVjdF9pZBIVQhMzNTcxNjk3MTYzNDI4MDMzNjIy&filename=&opi=89354086'
  },
  {
    name: 'expenses.html',
    url: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1NjYzYjZkMmY5ZGYwMzM4NWJjOTY2MzU4OWYwEgsSBxCPpeyk9xIYAZIBIwoKcHJvamVjdF9pZBIVQhMzNTcxNjk3MTYzNDI4MDMzNjIy&filename=&opi=89354086'
  },
  {
    name: 'drivers.html',
    url: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1NjYzYjM5ZjNmNjEwMmQzZmRjNDg3MWMwNzIxEgsSBxCPpeyk9xIYAZIBIwoKcHJvamVjdF9pZBIVQhMzNTcxNjk3MTYzNDI4MDMzNjIy&filename=&opi=89354086'
  },
  {
    name: 'maintenance.html',
    url: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1NjYzYjZhNmIwOTkwMzgzOWJiMjFkMjZhNTMzEgsSBxCPpeyk9xIYAZIBIwoKcHJvamVjdF9pZBIVQhMzNTcxNjk3MTYzNDI4MDMzNjIy&filename=&opi=89354086'
  }
];

const destDir = path.resolve('src/stitch_ui');
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

async function downloadAll() {
  console.log(`Starting download of ${screens.length} screens to ${destDir}...`);
  for (const s of screens) {
    try {
      console.log(`Fetching ${s.name} from URL...`);
      const res = await fetch(s.url);
      if (!res.ok) {
        throw new Error(`Status ${res.status}`);
      }
      const html = await res.text();
      const filePath = path.join(destDir, s.name);
      fs.writeFileSync(filePath, html);
      console.log(`Saved ${s.name} successfully.`);
    } catch (err) {
      console.error(`Failed to download ${s.name}:`, err.message);
    }
  }
  console.log('Download complete.');
}

downloadAll();
