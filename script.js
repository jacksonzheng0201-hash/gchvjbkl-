// Money Pal — budget tracker logic (plain JS, no libraries)

(function () {
  'use strict';

  var STORAGE_KEY = 'moneypal.entries.v1';
  var GOAL_KEY = 'moneypal.goal.v1';

  // state: { deposits: [{id,name,amount,date}], expenses: [...] }
  var state = load();
  // goal: { name, amount, deadline (YYYY-MM-DD) } or null
  var goal = loadGoal();

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var data = JSON.parse(raw);
        if (data && Array.isArray(data.deposits) && Array.isArray(data.expenses)) {
          return data;
        }
      }
    } catch (e) { /* corrupted or unavailable — start fresh */ }
    return { deposits: [], expenses: [] };
  }

  function loadGoal() {
    try {
      var raw = localStorage.getItem(GOAL_KEY);
      if (raw) {
        var g = JSON.parse(raw);
        if (g && typeof g.name === 'string' && g.amount > 0 && g.deadline) return g;
      }
    } catch (e) { /* start without a goal */ }
    return null;
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      if (goal) localStorage.setItem(GOAL_KEY, JSON.stringify(goal));
    } catch (e) { /* storage full or blocked; site still works in memory */ }
  }

  function money(n) {
    return '$' + n.toFixed(2);
  }

  function sum(list) {
    var total = 0;
    for (var i = 0; i < list.length; i++) total += list[i].amount;
    return total;
  }

  var $ = function (id) { return document.getElementById(id); };

  function renderList(listEl, items, sign, emptyText) {
    listEl.innerHTML = '';
    if (items.length === 0) {
      var li = document.createElement('li');
      li.className = 'list-empty';
      li.textContent = emptyText;
      listEl.appendChild(li);
      return;
    }
    items.forEach(function (item) {
      var li = document.createElement('li');
      li.className = 'entry';

      var info = document.createElement('div');
      info.className = 'entry-info';
      var name = document.createElement('span');
      name.className = 'entry-name';
      name.textContent = item.name;
      var date = document.createElement('span');
      date.className = 'entry-date';
      date.textContent = new Date(item.date).toLocaleDateString();
      info.appendChild(name);
      info.appendChild(date);

      var amount = document.createElement('span');
      amount.className = 'entry-amount';
      amount.textContent = sign + money(item.amount);

      var del = document.createElement('button');
      del.className = 'entry-delete';
      del.textContent = '✕';
      del.setAttribute('aria-label', 'Delete ' + item.name);
      del.addEventListener('click', function () {
        removeItem(item.id);
      });

      li.appendChild(info);
      li.appendChild(amount);
      li.appendChild(del);
      listEl.appendChild(li);
    });
  }

  function removeItem(id) {
    state.deposits = state.deposits.filter(function (d) { return d.id !== id; });
    state.expenses = state.expenses.filter(function (x) { return x.id !== id; });
    save();
    render();
  }

  function addItem(kind, name, amount) {
    state[kind].unshift({
      id: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      name: name,
      amount: amount,
      date: new Date().toISOString()
    });
    save();
    render();
  }

  // ===== Money Tree =====
  // 1 dollar deposited = 1g of energy. Checkpoints are % of the goal amount, so the
  // tree always finishes growing exactly when the goal is reached.
  var TREE_STAGES = [
    { pct: 0,    name: 'Tiny Seed',         msg: 'Plant your first dollar to wake up your seed!' },
    { pct: 0.10, name: 'Little Sprout',     msg: 'Woohoo! Your sprout popped out of the soil!' },
    { pct: 0.25, name: 'Small Sapling',     msg: 'Great job! Your sapling is getting taller!' },
    { pct: 0.50, name: 'Strong Young Tree', msg: 'Halfway there! Look at those leafy branches!' },
    { pct: 0.75, name: 'Big Happy Tree',    msg: 'So close! Your tree is almost fully grown!' },
    { pct: 1.00, name: 'Goal Tree',         msg: 'YOU DID IT! Your tree is ready — go get your goal! 🎉' }
  ];

  function stageGrams(stage) {
    return Math.ceil(stage.pct * goal.amount);
  }

  function treeStageIndex(energy) {
    var idx = 0;
    for (var i = 0; i < TREE_STAGES.length; i++) {
      if (energy >= stageGrams(TREE_STAGES[i])) idx = i;
    }
    return idx;
  }

  function escapeXml(str) {
    return str.replace(/[<>&"']/g, function (c) {
      return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function goalSign() {
    var label = escapeXml(goal.name);
    var fontSize = label.length > 14 ? 8 : 10;
    return '<g class="goal-sign">' +
      '<rect x="146" y="196" width="4" height="24" fill="#8b5a2b"/>' +
      '<rect x="118" y="178" width="60" height="22" rx="4" fill="#ffe7a8" stroke="#c9963a" stroke-width="2"/>' +
      '<text x="148" y="193" text-anchor="middle" font-size="' + fontSize + '" font-weight="bold" fill="#5b3a1a" font-family="Trebuchet MS, Verdana, sans-serif">' + label + '</text>' +
      '</g>';
  }

  function treeShape(stage) {
    var s = '';
    if (stage === 0) {
      s = '<ellipse cx="100" cy="216" rx="9" ry="7" fill="#8b5a2b"/>' +
          '<path d="M97 210 q3 -8 6 0" stroke="#6cbf5a" stroke-width="3" fill="none"/>';
    } else if (stage === 1) {
      s = '<line x1="100" y1="220" x2="100" y2="192" stroke="#4d7c0f" stroke-width="4" stroke-linecap="round"/>' +
          '<ellipse cx="90" cy="190" rx="12" ry="7" fill="#57c84d" transform="rotate(-30 90 190)"/>' +
          '<ellipse cx="110" cy="190" rx="12" ry="7" fill="#3fae36" transform="rotate(30 110 190)"/>';
    } else {
      var trunkW = 6 + stage;
      var trunkTop = 220 - (28 + stage * 12);
      s = '<rect x="' + (100 - trunkW / 2) + '" y="' + trunkTop + '" width="' + trunkW + '" height="' + (220 - trunkTop) + '" rx="3" fill="#8b5a2b"/>';
      var canopyR = 14 + stage * 5;
      var canopyY = trunkTop - canopyR * 0.45;
      s += '<circle cx="100" cy="' + canopyY + '" r="' + canopyR + '" fill="#3fae36"/>';
      if (stage >= 3) {
        s += '<circle cx="' + (100 - canopyR) + '" cy="' + (canopyY + 8) + '" r="' + (canopyR * 0.75) + '" fill="#57c84d"/>' +
             '<circle cx="' + (100 + canopyR) + '" cy="' + (canopyY + 8) + '" r="' + (canopyR * 0.75) + '" fill="#57c84d"/>';
      }
      if (stage >= 4) {
        s += '<circle cx="100" cy="' + (canopyY - canopyR * 0.7) + '" r="' + (canopyR * 0.8) + '" fill="#6fd860"/>';
      }
      if (stage >= 5) {
        var fruits = [[-18, -4], [10, 6], [-6, 14], [20, -14], [-24, 10]];
        for (var f = 0; f < fruits.length; f++) {
          s += '<circle cx="' + (100 + fruits[f][0]) + '" cy="' + (canopyY + fruits[f][1]) + '" r="5.5" fill="#e05252" stroke="#b91c1c" stroke-width="1"/>';
        }
        s += '<text x="100" y="' + (canopyY - canopyR - 6) + '" text-anchor="middle" font-size="16">⭐</text>';
      }
    }
    return s;
  }

  function daysUntil(dateStr) {
    var parts = dateStr.split('-');
    var target = new Date(parts[0], parts[1] - 1, parts[2]);
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((target - today) / 86400000);
  }

  function renderGoalInfo(energy) {
    $('goal-title').textContent = goal.name;

    var pct = Math.min(100, Math.round((energy / goal.amount) * 100));
    var remaining = Math.max(0, goal.amount - energy);
    $('goal-progress-text').textContent = remaining > 0
      ? money(energy) + ' saved of ' + money(goal.amount) + ' (' + pct + '%) — ' + money(remaining) + ' to go!'
      : money(energy) + ' saved — goal of ' + money(goal.amount) + ' reached! 🎉';

    var days = daysUntil(goal.deadline);
    var dl = $('goal-deadline-text');
    dl.className = 'goal-deadline';
    var pretty = new Date(goal.deadline + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    if (remaining <= 0) {
      dl.textContent = '📅 Deadline was ' + pretty + ' — you made it!';
    } else if (days > 1) {
      dl.textContent = '📅 ' + days + ' days left (by ' + pretty + ')';
      if (days <= 7) dl.classList.add('soon');
    } else if (days === 1) {
      dl.textContent = '📅 Tomorrow is the deadline (' + pretty + ')!';
      dl.classList.add('soon');
    } else if (days === 0) {
      dl.textContent = '📅 Today is the deadline!';
      dl.classList.add('soon');
    } else {
      dl.textContent = '📅 Deadline passed ' + (-days) + ' day' + (days === -1 ? '' : 's') + ' ago — keep going, you can still do it!';
      dl.classList.add('late');
    }
  }

  function renderTree(energy) {
    var idx = treeStageIndex(energy);
    var stage = TREE_STAGES[idx];
    var next = TREE_STAGES[idx + 1] || null;

    var grow = $('tree-grow');
    grow.innerHTML = treeShape(idx) + goalSign();

    var stageG = stageGrams(stage);
    var nextG = next ? stageGrams(next) : stageG;
    var progress = next && nextG > stageG ? (energy - stageG) / (nextG - stageG) : 1;
    var scale = Math.min(1.1, 0.5 + (idx + progress) * 0.12);
    grow.style.transform = 'scale(' + scale.toFixed(3) + ')';

    $('energy-grams').textContent = energy;
    $('stage-name').textContent = stage.name;
    $('tree-message').textContent = stage.msg;

    if (next) {
      $('next-checkpoint').textContent = next.name + ' at ' + nextG + 'g (' + (nextG - energy) + 'g to go)';
      $('progress-fill').style.width = Math.round(progress * 100) + '%';
    } else {
      $('next-checkpoint').textContent = 'GOAL REACHED — your ' + goal.name + ' tree is fully grown!';
      $('progress-fill').style.width = '100%';
    }

    renderGoalInfo(energy);
  }

  function render() {
    if (!goal) {
      showGoalOverlay();
      return;
    }
    $('goal-overlay').hidden = true;

    var depTotal = sum(state.deposits);
    var expTotal = sum(state.expenses);
    var balance = depTotal - expTotal;

    renderList($('deposit-list'), state.deposits, '+', 'No deposits yet — add the money you earned or were given!');
    renderList($('expense-list'), state.expenses, '-', 'No spending yet — add something you bought!');

    $('deposit-total').textContent = money(depTotal);
    $('expense-total').textContent = money(expTotal);
    $('deposit-count').textContent = state.deposits.length;
    $('expense-count').textContent = state.expenses.length;

    var balanceEl = $('balance');
    balanceEl.textContent = money(balance);
    balanceEl.classList.toggle('negative', balance < 0);

    renderTree(Math.floor(depTotal));

    var hasAny = state.deposits.length > 0 || state.expenses.length > 0;
    $('clear-all').hidden = !hasAny;
    $('empty-hint').style.display = hasAny ? 'none' : 'block';
  }

  function wireForm(formId, nameId, amountId, kind) {
    $(formId).addEventListener('submit', function (ev) {
      ev.preventDefault();
      var name = $(nameId).value.trim();
      var amount = parseFloat($(amountId).value);
      if (!name || isNaN(amount) || amount <= 0) {
        $(amountId).focus();
        return;
      }
      addItem(kind, name, Math.round(amount * 100) / 100);
      $(formId).reset();
      $(nameId).focus();
    });
  }

  wireForm('deposit-form', 'deposit-name', 'deposit-amount', 'deposits');
  wireForm('expense-form', 'expense-name', 'expense-amount', 'expenses');

  // ===== Goal setup =====
  function todayStr() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }

  function showGoalOverlay() {
    var deadlineInput = $('goal-deadline');
    deadlineInput.min = todayStr();
    if (goal) {
      $('goal-name').value = goal.name;
      $('goal-amount').value = goal.amount;
      deadlineInput.value = goal.deadline;
    }
    $('goal-overlay').hidden = false;
    $('goal-name').focus();
  }

  $('goal-form').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var name = $('goal-name').value.trim();
    var amount = parseFloat($('goal-amount').value);
    var deadline = $('goal-deadline').value;
    if (!name || isNaN(amount) || amount <= 0 || !deadline) return;
    goal = { name: name, amount: Math.round(amount * 100) / 100, deadline: deadline };
    save();
    render();
  });

  $('edit-goal').addEventListener('click', showGoalOverlay);

  $('clear-all').addEventListener('click', function () {
    if (confirm('Clear all deposits, spending and your goal? This cannot be undone.')) {
      state = { deposits: [], expenses: [] };
      goal = null;
      try { localStorage.removeItem(GOAL_KEY); } catch (e) { /* ignore */ }
      save();
      render();
    }
  });

  render();
})();
