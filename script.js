// Money Pal — budget tracker logic (plain JS, no libraries)

(function () {
  'use strict';

  var STORAGE_KEY = 'moneypal.entries.v1';

  // state: { deposits: [{id,name,amount,date}], expenses: [...] }
  var state = load();

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

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
  // 1 dollar deposited = 1g of tree energy. Tree only grows (spending never shrinks it).
  var TREE_STAGES = [
    { g: 0,   name: 'Tiny Seed',         msg: 'Plant your first dollar to wake up your seed!' },
    { g: 10,  name: 'Little Sprout',     msg: 'Woohoo! Your sprout popped out of the soil!' },
    { g: 25,  name: 'Small Sapling',     msg: 'Great job! Your sapling is getting taller!' },
    { g: 50,  name: 'Strong Young Tree', msg: 'Amazing! Look at those leafy branches!' },
    { g: 100, name: 'Big Happy Tree',    msg: 'WOW! Your tree is huge — you are a saving champion!' },
    { g: 200, name: 'Magic Fruit Tree',  msg: 'Magical! Your tree grew yummy fruit! ⭐' }
  ];

  function treeStageIndex(energy) {
    var idx = 0;
    for (var i = 0; i < TREE_STAGES.length; i++) {
      if (energy >= TREE_STAGES[i].g) idx = i;
    }
    return idx;
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
      }
    }
    return s;
  }

  function renderTree(energy) {
    var idx = treeStageIndex(energy);
    var stage = TREE_STAGES[idx];
    var next = TREE_STAGES[idx + 1] || null;

    var grow = $('tree-grow');
    grow.innerHTML = treeShape(idx);

    // Continuous growth: base scale per stage, creeping up within the stage
    var progress = next ? (energy - stage.g) / (next.g - stage.g) : 1;
    var scale = Math.min(1.1, 0.5 + (idx + progress) * 0.12);
    grow.style.transform = 'scale(' + scale.toFixed(3) + ')';

    $('energy-grams').textContent = energy;
    $('stage-name').textContent = stage.name;
    $('tree-message').textContent = stage.msg;

    if (next) {
      $('next-checkpoint').textContent = next.name + ' at ' + next.g + 'g (' + (next.g - energy) + 'g to go)';
      $('progress-fill').style.width = Math.round(progress * 100) + '%';
    } else {
      $('next-checkpoint').textContent = 'MAX LEVEL — you grew the Magic Fruit Tree!';
      $('progress-fill').style.width = '100%';
    }
  }

  function render() {
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

  $('clear-all').addEventListener('click', function () {
    if (confirm('Clear all deposits and spending? This cannot be undone.')) {
      state = { deposits: [], expenses: [] };
      save();
      render();
    }
  });

  render();
})();
