// Token Launch Radar's dashboard. It reads window.RADAR (written beside dashboard/ by main.ts)
// and renders the ranked board, a filterable table, a per-protocol detail drawer with the model's
// own breakdown and the protocol's farm plan, and the calibration behind the model. No network:
// every byte it shows is in data.js. The farm plan below follows the same rules as lib/model.ts,
// so the plan the page shows is the plan board.json carries.
(function () {
  var DATA = window.RADAR;
  var state = { q: '', cat: 'all', chain: 'all', min: '0', wl: false, tab: 'pre-token', sort: 'rank', dir: 1, detail: null };

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function fmtUsd(n) {
    if (n === null || n === undefined) return '—';
    var a = Math.abs(n);
    if (a >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (a >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (a >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + Math.round(n);
  }
  function fmtFull(n) {
    if (n === null || n === undefined) return '—';
    return '$' + Math.round(n).toLocaleString('en-US');
  }
  function fmtPct(n) {
    if (n === null || n === undefined) return '—';
    var s = (n > 0 ? '+' : '') + n.toFixed(1) + '%';
    return s;
  }
  function pctClass(n) {
    if (n === null || n === undefined) return 'mut';
    return n > 0 ? 'pos' : n < 0 ? 'neg' : 'mut';
  }
  function fmtAge(days) {
    if (days === null || days === undefined) return '—';
    if (days >= 365) return (days / 365).toFixed(1) + 'y';
    return days + 'd';
  }
  function fmtMult(n) {
    return '×' + n.toFixed(3);
  }

  /* ---- the farm plan: the same rules lib/model.ts uses, so page and board agree ---- */

  function chainOf(p) { return p.chains && p.chains.length > 0 ? p.chains[0] : 'its main chain'; }
  function capitalFor(p) {
    if (p.tvl_usd >= 5000000000) return 250;
    if (p.tvl_usd >= 1000000000) return 150;
    if (p.tvl_usd >= 100000000) return 100;
    return 50;
  }
  function gasFor(chain) {
    var c = String(chain).toLowerCase();
    if (c === 'ethereum') return 'about $8 of gas';
    if (c === 'solana') return 'under $0.10 of gas';
    return 'about $2 of gas';
  }
  function holdDaysFor(age) {
    if (age === null || age === undefined) return 45;
    if (age < 180) return 60;
    if (age < 365) return 45;
    return 30;
  }
  function actionFor(p, capital, chain) {
    var c = (p.category || '').toLowerCase();
    var name = p.name;
    if (c.indexOf('lend') >= 0 || c.indexOf('cdp') >= 0 || c.indexOf('collateral') >= 0) return 'Supply $' + capital + ' of USDC to ' + name + ' on ' + chain + ', borrow a small amount against it, then repay half.';
    if (c.indexOf('dex') >= 0) return 'Provide $' + capital + ' of liquidity to ' + name + '\'s deepest pool on ' + chain + ' and make one swap through it.';
    if (c.indexOf('perpetual') >= 0 || c.indexOf('derivative') >= 0 || c.indexOf('options') >= 0) return 'Deposit $' + capital + ' of USDC as margin on ' + name + ' and open one small hedged position.';
    if (c.indexOf('bridge') >= 0) return 'Bridge $' + capital + ' of USDC into ' + chain + ' through ' + name + ', then use the bridged funds inside its app.';
    if (c.indexOf('staking') >= 0 || c.indexOf('restak') >= 0) return 'Stake $' + capital + ' of the chain\'s staking asset through ' + name + ' and keep the receipt token in the farming wallet.';
    if (c.indexOf('yield') >= 0 || c.indexOf('vault') >= 0) return 'Deposit $' + capital + ' into ' + name + '\'s highest-TVL vault on ' + chain + ' and leave it earning.';
    if (c.indexOf('rwa') >= 0 || c.indexOf('real world') >= 0) return 'Mint $' + capital + ' of ' + name + '\'s yield-bearing asset on ' + chain + ' and hold it in the farming wallet.';
    if (c.indexOf('prediction') >= 0) return 'Fund $' + capital + ' and place one small position on a ' + name + ' market, then let it settle.';
    if (c.indexOf('stable') >= 0) return 'Mint or deposit $' + capital + ' of the stable asset through ' + name + ' on ' + chain + ' and hold it.';
    if (c.indexOf('insurance') >= 0) return 'Buy $' + capital + ' of cover from ' + name + ' on ' + chain + ' and keep the policy active.';
    if (c.indexOf('curator') >= 0 || c.indexOf('allocator') >= 0 || c.indexOf('risk') >= 0) return 'Deposit $' + capital + ' into a ' + name + ' vault on ' + chain + ' and keep the vault shares.';
    if (c.indexOf('basis') >= 0) return 'Deposit $' + capital + ' into ' + name + '\'s basis position on ' + chain + ' and keep it open.';
    return 'Deposit $' + capital + ' of USDC into ' + name + ' on ' + chain + ' and keep the position open.';
  }
  function farmPlan(p) {
    var chain = chainOf(p);
    var second = p.chains && p.chains.length > 1 ? p.chains[1] : null;
    var capital = capitalFor(p);
    var hold = holdDaysFor(p.age_days);
    var gas = gasFor(chain);
    var steps = [
      { text: 'Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.', cost: 'under $3 of gas for the first transaction', time: '5 minutes' },
      { text: actionFor(p, capital, chain), cost: '$' + capital + ' of capital and ' + gas, time: '15 minutes to set up' }
    ];
    if (second !== null) {
      steps.push({ text: 'Repeat the core action on ' + second + ' with half the capital, $' + Math.floor(capital / 2) + ', so the wallet is active on two chains.', cost: '$' + Math.floor(capital / 2) + ' of capital and ' + gasFor(second), time: '10 minutes' });
    } else {
      steps.push({ text: 'Use a second feature of ' + p.name + ', such as another pool or market, so the wallet touches two parts of the app.', cost: '$' + Math.floor(capital / 2) + ' of capital and ' + gas, time: '10 minutes' });
    }
    steps.push(
      { text: 'Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote, and never let a week pass empty.', cost: 'about $2 of gas a week', time: '10 minutes a week' },
      { text: 'Hold the position for at least ' + hold + ' days so the activity is counted in more than one snapshot.', cost: 'the $' + capital + ' stays in the position', time: hold + ' days' },
      { text: 'Before you withdraw, open the protocol\'s own points or rewards page and claim only from the link it publishes.', cost: 'no fee to check, and never pay to claim', time: '10 minutes' },
      { text: 'Write the wallet, the dates and every transaction in a farm log so you can repeat the position or unwind it.', cost: 'nothing but the log', time: '5 minutes' }
    );
    return steps;
  }

  /* ---- state in the hash, so a view is a link ---- */

  function readHash() {
    var h = window.location.hash.replace(/^#/, '');
    var q = new URLSearchParams(h);
    if (q.get('q') !== null) state.q = q.get('q');
    if (q.get('cat') !== null) state.cat = q.get('cat');
    if (q.get('chain') !== null) state.chain = q.get('chain');
    if (q.get('min') !== null) state.min = q.get('min');
    if (q.get('wl') !== null) state.wl = q.get('wl') === '1';
    if (q.get('tab') !== null) state.tab = q.get('tab');
    if (q.get('sort') !== null) state.sort = q.get('sort');
    if (q.get('dir') !== null) state.dir = parseInt(q.get('dir'), 10) || 1;
    state.detail = q.get('detail');
  }
  function writeHash() {
    var q = new URLSearchParams();
    if (state.q) q.set('q', state.q);
    if (state.cat !== 'all') q.set('cat', state.cat);
    if (state.chain !== 'all') q.set('chain', state.chain);
    if (state.min !== '0') q.set('min', state.min);
    if (state.wl) q.set('wl', '1');
    if (state.tab !== 'pre-token') q.set('tab', state.tab);
    if (state.sort !== 'rank') q.set('sort', state.sort);
    if (state.dir !== 1) q.set('dir', String(state.dir));
    if (state.detail) q.set('detail', state.detail);
    var s = q.toString();
    history.replaceState(null, '', s ? '#' + s : window.location.pathname);
  }
  window.addEventListener('hashchange', function () { readHash(); render(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && state.detail) { state.detail = null; writeHash(); render(); }
  });

  /* ---- filtering and sorting ---- */

  function rows() {
    if (state.tab === 'live') return DATA.live.slice();
    var q = state.q.trim().toLowerCase();
    var min = parseFloat(state.min) || 0;
    return DATA.rows.filter(function (r) {
      if (state.wl && !r.watchlist) return false;
      if (r.tvl_usd < min) return false;
      if (state.cat !== 'all' && (r.category || 'Uncategorized') !== state.cat) return false;
      if (state.chain !== 'all' && r.chains.indexOf(state.chain) < 0) return false;
      if (q && (r.name + ' ' + r.slug + ' ' + (r.category || '')).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
  }
  function sortVal(r, key) {
    if (key === 'rank') return r.rank !== undefined ? r.rank : 1e9;
    if (key === 'tvl') return r.tvl_usd;
    if (key === 'change') return r.change_7d === null ? -1e9 : r.change_7d;
    if (key === 'age') return r.age_days === null || r.age_days === undefined ? -1 : r.age_days;
    if (key === 'name') return r.name;
    if (key === 'mcap') return r.mcap_usd === null ? -1 : r.mcap_usd;
    if (key === 'ratio') return r.mcap_tvl_ratio === null ? -1 : r.mcap_tvl_ratio;
    return r.implied_value_usd !== undefined ? r.implied_value_usd : 0;
  }
  function sortedRows(list) {
    var key = state.sort;
    var dir = state.dir;
    return list.slice().sort(function (a, b) {
      var va = sortVal(a, key), vb = sortVal(b, key);
      if (typeof va === 'string') return dir * (va < vb ? -1 : va > vb ? 1 : 0);
      if (va !== vb) return dir * (va - vb);
      return a.slug < b.slug ? -1 : 1;
    });
  }

  /* ---- small DOM helpers ---- */

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'text') node.textContent = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2), v);
      else if (k === 'class') node.className = v;
      else node.setAttribute(k, v);
    });
    if (children) children.forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }
  function peerRowFor(row) {
    var key = row.category || 'Uncategorized';
    var found = null;
    DATA.calibration.by_category.forEach(function (c) { if (c.category === key) found = c; });
    return found;
  }

  /* ---- sections ---- */

  function renderMeta() {
    var box = document.getElementById('top-meta');
    box.innerHTML = '';
    [['Snapshot', DATA.as_of], ['Model', DATA.model_version], ['Floor', fmtUsd(DATA.floor_usd)], ['Source', 'DefiLlama, frozen']].forEach(function (kv) {
      box.appendChild(el('span', { class: 'chip' }, [el('b', { text: kv[0] + ' ' }), document.createTextNode(kv[1])]));
    });
  }
  function renderFacts() {
    var total = DATA.rows.reduce(function (s, r) { return s + r.implied_value_usd; }, 0);
    var covered = DATA.rows.filter(function (r) { return r.watchlist; }).length;
    var box = document.getElementById('facts');
    box.innerHTML = '';
    [
      [String(DATA.board_size), 'protocols ranked'],
      [covered + ' of ' + DATA.watchlist_size, 'watchlist covered'],
      [fmtUsd(total), 'combined implied value'],
      [fmtMult(DATA.calibration.global_median), 'global peer multiple · ' + DATA.calibration.global_peers + ' peers']
    ].forEach(function (f) {
      box.appendChild(el('div', { class: 'fact' }, [el('b', { text: f[0] }), el('span', { text: f[1] })]));
    });
  }
  function renderControls() {
    var box = document.getElementById('controls');
    box.innerHTML = '';
    var cats = ['all'].concat(Array.from(new Set(DATA.rows.map(function (r) { return r.category || 'Uncategorized'; })))).sort();
    var chains = ['all'].concat(Array.from(new Set(DATA.rows.reduce(function (a, r) { return a.concat(r.chains); }, [])))).sort();
    var search = el('input', { type: 'search', value: state.q, placeholder: 'Search name or slug', 'aria-label': 'Search protocols' });
    search.addEventListener('input', function () { state.q = search.value; writeHash(); renderTable(); });
    var catSel = el('select', { 'aria-label': 'Category' }, cats.map(function (c) {
      return el('option', { value: c, text: c === 'all' ? 'All categories' : c, selected: c === state.cat ? 'selected' : null });
    }));
    catSel.addEventListener('change', function () { state.cat = catSel.value; writeHash(); renderTable(); });
    var chainSel = el('select', { 'aria-label': 'Chain' }, chains.map(function (c) {
      return el('option', { value: c, text: c === 'all' ? 'All chains' : c, selected: c === state.chain ? 'selected' : null });
    }));
    chainSel.addEventListener('change', function () { state.chain = chainSel.value; writeHash(); renderTable(); });
    var minSel = el('select', { 'aria-label': 'Minimum TVL' }, [
      ['0', 'Any TVL'], ['50000000', 'TVL $50M+'], ['100000000', 'TVL $100M+'], ['1000000000', 'TVL $1B+']
    ].map(function (o) { return el('option', { value: o[0], text: o[1], selected: o[0] === state.min ? 'selected' : null }); }));
    minSel.addEventListener('change', function () { state.min = minSel.value; writeHash(); renderTable(); });
    var wl = el('label', { class: 'check' }, [
      el('input', { type: 'checkbox', checked: state.wl ? 'checked' : null }),
      document.createTextNode('Watchlist only')
    ]);
    wl.querySelector('input').addEventListener('change', function (e) { state.wl = e.target.checked; writeHash(); renderTable(); });
    var tabs = el('div', { class: 'tabs' }, [
      el('button', { type: 'button', class: 'tab', 'aria-pressed': state.tab === 'pre-token' ? 'true' : 'false', text: 'Pre-token board', onclick: function () { state.tab = 'pre-token'; state.sort = 'rank'; state.dir = 1; writeHash(); render(); } }),
      el('button', { type: 'button', class: 'tab', 'aria-pressed': state.tab === 'live' ? 'true' : 'false', text: 'Already trading', onclick: function () { state.tab = 'live'; state.sort = 'mcap'; state.dir = -1; writeHash(); render(); } })
    ]);
    box.appendChild(el('div', { class: 'field' }, [el('label', { text: 'Search' }), search]));
    box.appendChild(el('div', { class: 'field' }, [el('label', { text: 'Category' }), catSel]));
    box.appendChild(el('div', { class: 'field' }, [el('label', { text: 'Chain' }), chainSel]));
    box.appendChild(el('div', { class: 'field' }, [el('label', { text: 'Minimum TVL' }), minSel]));
    box.appendChild(wl);
    box.appendChild(tabs);
  }
  function sortHeader(key, label, numeric) {
    var arrow = state.sort === key ? (state.dir < 0 ? ' ↓' : ' ↑') : '';
    return el('th', { class: numeric ? 'num' : null }, [
      el('button', {
        type: 'button', text: label + arrow, onclick: function () {
          if (state.sort === key) state.dir = -state.dir;
          else { state.sort = key; state.dir = key === 'name' ? 1 : -1; }
          writeHash(); renderTable();
        }
      })
    ]);
  }
  function renderTable() {
    var wrap = document.getElementById('table-wrap');
    wrap.innerHTML = '';
    var list = sortedRows(rows());
    if (list.length === 0) {
      wrap.appendChild(el('div', { class: 'empty' }, [
        el('h2', { text: 'No protocol matches that filter' }),
        el('button', { class: 'button primary', type: 'button', text: 'Clear filters', onclick: function () { state.q = ''; state.cat = 'all'; state.chain = 'all'; state.min = '0'; state.wl = false; writeHash(); render(); } })
      ]));
      return;
    }
    var table = el('table', null, []);
    var head = el('tr', null, []);
    if (state.tab === 'live') {
      head.appendChild(sortHeader('name', 'Protocol', false));
      head.appendChild(el('th', { text: 'Category' }));
      head.appendChild(el('th', { text: 'Chains' }));
      head.appendChild(sortHeader('tvl', 'TVL', true));
      head.appendChild(sortHeader('mcap', 'Market cap', true));
      head.appendChild(sortHeader('ratio', 'Mcap / TVL', true));
      head.appendChild(sortHeader('change', '7d', true));
    } else {
      head.appendChild(sortHeader('rank', '#', true));
      head.appendChild(sortHeader('name', 'Protocol', false));
      head.appendChild(el('th', { text: 'Category' }));
      head.appendChild(el('th', { text: 'Chains' }));
      head.appendChild(sortHeader('tvl', 'TVL', true));
      head.appendChild(sortHeader('change', '7d', true));
      head.appendChild(sortHeader('age', 'Age', true));
      head.appendChild(sortHeader('implied', 'Implied value', true));
    }
    table.appendChild(el('thead', null, [head]));
    var body = el('tbody', null, []);
    list.forEach(function (r) {
      var tr = el('tr', {
        onclick: function () { state.detail = r.slug; writeHash(); renderDetail(); }
      }, []);
      if (state.tab === 'live') {
        tr.appendChild(el('td', null, [el('span', { class: 'name', text: r.name }), el('div', { class: 'sub', text: r.slug })]));
        tr.appendChild(el('td', { text: r.category || '—' }));
        tr.appendChild(el('td', { text: r.chains.slice(0, 3).join(', ') + (r.chains.length > 3 ? ' +' + (r.chains.length - 3) : '') }));
        tr.appendChild(el('td', { class: 'num', text: fmtUsd(r.tvl_usd) }));
        tr.appendChild(el('td', { class: 'num', text: fmtUsd(r.mcap_usd) }));
        tr.appendChild(el('td', { class: 'num', text: r.mcap_tvl_ratio === null ? '—' : fmtMult(r.mcap_tvl_ratio) }));
        tr.appendChild(el('td', { class: 'num ' + pctClass(r.change_7d), text: fmtPct(r.change_7d) }));
      } else {
        tr.appendChild(el('td', { class: 'num', text: '#' + r.rank }));
        var nameCell = el('td', null, [el('span', { class: 'name', text: r.name }), el('div', { class: 'sub', text: r.slug })]);
        if (r.watchlist) nameCell.appendChild(el('span', { class: 'badge watch', text: 'Watchlist' }));
        tr.appendChild(nameCell);
        tr.appendChild(el('td', { text: r.category || '—' }));
        tr.appendChild(el('td', { text: r.chains.slice(0, 3).join(', ') + (r.chains.length > 3 ? ' +' + (r.chains.length - 3) : '') }));
        tr.appendChild(el('td', { class: 'num', text: fmtUsd(r.tvl_usd) }));
        tr.appendChild(el('td', { class: 'num ' + pctClass(r.change_7d), text: fmtPct(r.change_7d) }));
        tr.appendChild(el('td', { class: 'num', text: fmtAge(r.age_days) }));
        tr.appendChild(el('td', { class: 'num', html: '<b>' + esc(fmtUsd(r.implied_value_usd)) + '</b>' }));
      }
      body.appendChild(tr);
    });
    table.appendChild(body);
    wrap.appendChild(table);
    wrap.appendChild(el('p', { class: 'count', text: 'Showing ' + list.length + ' of ' + (state.tab === 'live' ? DATA.live_size : DATA.board_size) + ' protocols.' }));
  }
  function valueBreakdown(row) {
    var peer = peerRowFor(row);
    var growthPct = Math.min(100, Math.max(-50, row.change_7d === null ? 0 : row.change_7d));
    var lines = [
      ['TVL', fmtFull(row.tvl_usd)],
      ['Peer multiple (' + (row.category || 'Uncategorized') + ')', fmtMult(row.peer_multiple) + (peer ? ' · ' + peer.peers + ' peers, median ' + fmtMult(peer.median_multiple) : '')],
      ['Growth multiplier (' + fmtPct(growthPct) + ' 7d)', fmtMult(row.growth_multiplier)],
      ['Maturity multiplier (' + fmtAge(row.age_days) + ' tracked)', fmtMult(row.maturity_multiplier)],
      ['Chain breadth multiplier (' + row.chains.length + ' chain' + (row.chains.length === 1 ? '' : 's') + ')', fmtMult(row.breadth_multiplier)]
    ];
    var box = el('div', { class: 'breakdown' }, [el('h3', { text: 'Implied value breakdown' })]);
    lines.forEach(function (l) {
      box.appendChild(el('div', { class: 'rowline' }, [el('span', { text: l[0] }), el('span', { text: l[1] })]));
    });
    box.appendChild(el('div', { class: 'rowline total' }, [el('span', { text: 'Implied value' }), el('span', { text: fmtFull(row.implied_value_usd) })]));
    return box;
  }
  function renderDetail() {
    var drawer = document.getElementById('drawer');
    drawer.innerHTML = '';
    if (!state.detail) { drawer.className = ''; return; }
    var row = null;
    DATA.rows.forEach(function (r) { if (r.slug === state.detail) row = r; });
    var live = null;
    if (!row) DATA.live.forEach(function (r) { if (r.slug === state.detail) live = r; });
    if (!row && !live) { drawer.className = ''; return; }
    drawer.className = 'open';
    drawer.appendChild(el('button', { class: 'close', type: 'button', text: '×', 'aria-label': 'Close detail', onclick: function () { state.detail = null; writeHash(); renderDetail(); } }));
    var p = row || live;
    drawer.appendChild(el('h2', { text: p.name }));
    var badges = el('p', null, []);
    if (row) {
      badges.appendChild(el('span', { class: 'badge', text: 'Pre-token' }));
      if (row.watchlist) badges.appendChild(el('span', { class: 'badge watch', text: 'Watchlist' }));
    } else {
      badges.appendChild(el('span', { class: 'badge live', text: 'Token already trades' }));
    }
    drawer.appendChild(badges);
    drawer.appendChild(el('p', { class: 'sub', text: p.slug + ' · ' + (p.category || 'Uncategorized') + ' · ' + p.chains.join(', ') }));
    var kv = el('div', { class: 'kv' }, []);
    function kvCell(label, value) { kv.appendChild(el('div', null, [el('b', { text: value }), el('span', { text: label })])); }
    kvCell('TVL', fmtFull(p.tvl_usd));
    kvCell('7-day change', fmtPct(p.change_7d));
    if (row) {
      kvCell('Implied value', fmtFull(row.implied_value_usd));
      kvCell('Tracked', p.listed_at ? p.listed_at + ' (' + fmtAge(row.age_days) + ')' : 'date not reported');
    } else {
      kvCell('Market cap', fmtFull(p.mcap_usd));
      kvCell('Mcap / TVL', p.mcap_tvl_ratio === null ? '—' : fmtMult(p.mcap_tvl_ratio));
    }
    drawer.appendChild(kv);
    if (row) {
      drawer.appendChild(valueBreakdown(row));
      var peer = peerRowFor(row);
      if (peer) {
        drawer.appendChild(el('p', { class: 'sub', text: peer.peers + ' tokenized ' + (row.category || 'Uncategorized') + ' protocol' + (peer.peers === 1 ? '' : 's') + ' trade at a median ' + fmtMult(peer.median_multiple) + ' of TVL; shrunk toward the global median ' + fmtMult(DATA.calibration.global_median) + ' it sets the ' + fmtMult(row.peer_multiple) + ' multiple for this row. No protocol name is special-cased.' }));
      }
      drawer.appendChild(el('div', { class: 'note', text: 'This protocol records no token in the snapshot. That is what its record says, never proof it has none: a token its record does not carry is still possible.' }));
      drawer.appendChild(el('h3', { text: 'Farm plan' }));
      var plan = el('ol', { class: 'plan' }, []);
      farmPlan(row).forEach(function (s) {
        plan.appendChild(el('li', null, [
          document.createTextNode(s.text),
          el('span', { class: 'meta', html: '<b>Cost:</b> ' + esc(s.cost) + ' · <b>Time:</b> ' + esc(s.time) })
        ]));
      });
      drawer.appendChild(plan);
    } else {
      drawer.appendChild(el('div', { class: 'note', text: 'This protocol already has a token that trades, so there is no launch left to farm. It is shown at the market\'s own value, apart from the ranked pre-token board.' }));
    }
  }
  function renderModel() {
    var box = document.getElementById('model');
    box.innerHTML = '';
    box.appendChild(el('h2', { text: 'How the implied value is calculated' }));
    box.appendChild(el('p', { html: 'Every row follows one formula, from the snapshot alone: <code>implied = TVL × peer multiple × growth × maturity × breadth</code>. The peer multiple is the median market-cap-to-TVL ratio of the tokenized protocols in the same category, shrunk toward the global median so a thin category cannot set a wild multiple: <code>(n × median + 8 × global) ÷ (n + 8)</code>, and never more than 4× the global median, so one thin peer at 400× the market cannot price a whole category. Growth is the seven-day TVL change clamped to −50%…+100% at half weight; maturity rises with days tracked up to three years; breadth adds 2% per extra chain, up to five. Unknown age counts as 365 days, unknown growth as 0%.' }));
    var table = el('table', null, []);
    table.appendChild(el('thead', null, [el('tr', null, [
      el('th', { text: 'Category' }), el('th', { class: 'num', text: 'Peers' }),
      el('th', { class: 'num', text: 'Median multiple' }), el('th', { class: 'num', text: 'Multiple used' })
    ])]));
    var body = el('tbody', null, []);
    DATA.calibration.by_category.slice(0, 14).forEach(function (c) {
      body.appendChild(el('tr', null, [
        el('td', { text: c.category }),
        el('td', { class: 'num', text: String(c.peers) }),
        el('td', { class: 'num', text: fmtMult(c.median_multiple) }),
        el('td', { class: 'num', text: fmtMult(c.multiple) })
      ]));
    });
    table.appendChild(body);
    box.appendChild(table);
    box.appendChild(el('p', { class: 'sub', text: 'Categories with no tokenized peers use the global median. The full calibration is in the data beside this page. A protocol is pre-token when its record carries no market cap, no CoinGecko id and no symbol. The snapshot\'s own watchlist rule is applied to every row alike: exchanges, bridges, liquid staking and restaking products, names carrying a whole word wrapped, staked or staking, names beginning with an exchange\'s name, and versioned pools are never ranked. A protocol that records a token identity but no market cap appears on neither tab: the snapshot gives it no value to rank or to show.' }));
  }
  function renderFoot() {
    var box = document.getElementById('foot');
    box.textContent = 'Source: ' + DATA.source + '. Implied values are this radar\'s own claim, never make.fun\'s. A board\'s implied value is what a token would be worth if the protocol\'s record stayed as it is; it does not predict whether or when a token is issued.';
  }
  function render() {
    renderMeta();
    renderFacts();
    renderControls();
    renderTable();
    renderModel();
    renderFoot();
    renderDetail();
  }
  readHash();
  render();
})();
