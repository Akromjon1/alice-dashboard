const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

let cachedStats = null;
let cacheTime = 0;
const CACHE_TTL = 10000; // 10 seconds

async function getSystemStats() {
  const now = Date.now();
  if (cachedStats && now - cacheTime < CACHE_TTL) return cachedStats;

  try {
    const [memRes, vmRes, cpuRes, diskRes, uptimeRes] = await Promise.all([
      execAsync('/usr/sbin/sysctl -n hw.memsize'),
      execAsync('/usr/bin/vm_stat'),
      execAsync("/usr/bin/top -l 1 -n 0 | grep 'CPU usage'"),
      execAsync('/bin/df -g / | tail -1'),
      execAsync('/usr/bin/uptime'),
    ]);

    const totalMem = parseInt(memRes.stdout.trim());
    const vmStat = vmRes.stdout;
    const pageSize = 16384;
    const parse = (key) => {
      const m = vmStat.match(new RegExp(`${key}:\\s+(\\d+)`));
      return m ? parseInt(m[1]) * pageSize : 0;
    };
    const free = parse('Pages free') + parse('Pages purgeable');
    const used = totalMem - free;
    const cpuMatch = cpuRes.stdout.match(/([\d.]+)% idle/);
    const cpuUsage = cpuMatch ? (100 - parseFloat(cpuMatch[1])).toFixed(1) : '?';
    const disk = diskRes.stdout.trim().split(/\s+/);

    cachedStats = {
      ram: { total: totalMem, used, free, totalGB: (totalMem / 1073741824).toFixed(1), usedGB: (used / 1073741824).toFixed(1), freeGB: (free / 1073741824).toFixed(1), percent: ((used / totalMem) * 100).toFixed(1) },
      cpu: { usage: cpuUsage + '%' },
      disk: { totalGB: disk[1], usedGB: disk[2], freeGB: disk[3] },
      uptime: uptimeRes.stdout.trim(),
    };
    cacheTime = now;
    return cachedStats;
  } catch {
    return null;
  }
}

module.exports = { getSystemStats };
