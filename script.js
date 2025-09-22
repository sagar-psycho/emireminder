let loans = [];
let editIndex = null;
let actionIndex = null;
let actionType = ''; 
let isSmartView = false; 

// Load loans from localStorage
function loadLoans(){
  const stored = localStorage.getItem('loans');
  if(stored) loans = JSON.parse(stored);
}

// Save loans to localStorage
function saveLoans(){
  localStorage.setItem('loans', JSON.stringify(loans));
}

// Calculate days left until EMI
function daysDifference(dateStr){
  const today = new Date();
  const emi = new Date(dateStr);
  const diffTime = emi - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Show toast
function showToast(message){
  const toastMsg = document.getElementById('toastMsg');
  toastMsg.textContent = message;
  const toastEl = new bootstrap.Toast(document.getElementById('toast'));
  toastEl.show();
}

// Toggle Smart View
document.getElementById('smartViewBtn').addEventListener('click', function(){
  isSmartView = !isSmartView;
  this.textContent = isSmartView ? "Normal View" : "Smart View";
  renderTable();
});

// Render UI (table or cards)
function renderTable() {
  const wrapper = document.getElementById('viewWrapper');
  wrapper.innerHTML = '';

  let totalPaid = 0;
  let totalDue = 0;

  // Sort loans: unpaid first (by EMI date), then paid
  loans.sort((a, b) => {
    if (a.paid === b.paid) {
      return new Date(a.emiDate) - new Date(b.emiDate);
    }
    return a.paid ? 1 : -1; 
  });

  if(isSmartView){
    // Smart View (cards)
    const container = document.createElement('div');
    container.className = "row g-3";

    loans.forEach((loan, index) => {
      const daysLeft = daysDifference(loan.emiDate);
      if(loan.paid) totalPaid += parseFloat(loan.amount);
      else totalDue += parseFloat(loan.amount);

      const card = document.createElement('div');
      card.className = "col-md-4";
      card.innerHTML = `
        <div class="card ${loan.paid ? 'bg-success text-white' : daysLeft < 0 ? 'bg-danger text-white' : 'bg-light'}">
          <div class="card-body">
            <h5 class="card-title">${loan.name}</h5>
            <p class="card-text">Amount: ₹${loan.amount}</p>
            <p class="card-text">Date: ${loan.emiDate}</p>
            <p class="card-text">Status: ${
              loan.paid 
                ? `✅ Paid on ${loan.paidDate}` 
                : daysLeft < 0 
                  ? '❌ Overdue' 
                  : daysLeft + ' day(s) left'
            }</p>
            <div class="d-flex justify-content-between">
              <button class="btn btn-success btn-sm" onclick="markPaid(${index})" ${loan.paid ? 'disabled' : ''}>Paid</button>
              <button class="btn btn-warning btn-sm" onclick="editLoan(${index})">Edit</button>
              <button class="btn btn-danger btn-sm" onclick="confirmAction(${index}, 'delete')">Delete</button>
            </div>
          </div>
        </div>
      `;
      container.appendChild(card);
    });

    // Totals card
    const totalCard = document.createElement('div');
    totalCard.className = "col-md-12";
    totalCard.innerHTML = `
      <div class="card border-secondary">
        <div class="card-body">
          <h5 class="card-title">Totals</h5>
          <p class="card-text">Paid: ₹${totalPaid.toFixed(2)} | Due: ₹${totalDue.toFixed(2)}</p>
        </div>
      </div>
    `;
    container.appendChild(totalCard);

    wrapper.appendChild(container);

  } else {
    // Normal Table View
    const table = document.createElement('table');
    table.className = "table table-bordered align-middle";
    table.id = "loanTable";
    table.innerHTML = `
      <thead class="table-light">
        <tr>
          <th>Loan</th>
          <th>Amount</th>
          <th>EMI Date</th>
          <th>Countdown</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = table.querySelector('tbody');

    loans.forEach((loan, index) => {
      const daysLeft = daysDifference(loan.emiDate);
      const tr = document.createElement('tr');

      if(loan.paid) {
        tr.classList.add('paid-row');
        totalPaid += parseFloat(loan.amount);
      } else {
        if(daysLeft < 0) tr.classList.add('due-row');
        totalDue += parseFloat(loan.amount);
      }

      tr.innerHTML = `
        <td>${loan.name}</td>
        <td>${loan.amount}</td>
        <td>${loan.emiDate}</td>
        <td>${loan.paid ? `Paid on ${loan.paidDate}` : (daysLeft < 0 ? 'Overdue' : daysLeft + ' day(s)')}</td>
        <td>${loan.paid ? 'Paid' : 'Pending'}</td>
        <td>
          <button class="btn btn-success btn-sm me-1" onclick="markPaid(${index})" ${loan.paid ? 'disabled' : ''}>Paid</button>
          <button class="btn btn-warning btn-sm me-1" onclick="editLoan(${index})">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="confirmAction(${index}, 'delete')">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Totals row
    const totalRow = document.createElement('tr');
    totalRow.classList.add('table-secondary');
    totalRow.innerHTML = `
      <td><strong>Totals</strong></td>
      <td><strong>Paid: ${totalPaid.toFixed(2)}</strong></td>
      <td><strong>Due: ${totalDue.toFixed(2)}</strong></td>
      <td colspan="3"></td>
    `;
    tbody.appendChild(totalRow);

    wrapper.appendChild(table);
  }
}

// Add / Edit Loan
document.getElementById('loanForm').addEventListener('submit', function(e){
  e.preventDefault();
  const name = document.getElementById('loanName').value.trim();
  const amount = document.getElementById('loanAmount').value;
  const emiDate = document.getElementById('emiDate').value;

  if(!name || !amount || !emiDate){
    showToast("Please fill all fields!");
    return;
  }

  const today = new Date().toISOString().split('T')[0];
  if(emiDate < today){
    showToast("EMI date cannot be in the past!");
    return;
  }

  if(editIndex !== null){
    loans[editIndex].name = name;
    loans[editIndex].amount = amount;
    loans[editIndex].emiDate = emiDate;
    editIndex = null;
    document.getElementById('addBtn').textContent = "Add";
  } else {
    loans.push({name, amount, emiDate, paid: false});
  }

  saveLoans();
  renderTable();
  this.reset();
});

// Edit Loan
function editLoan(index){
  const loan = loans[index];
  document.getElementById('loanName').value = loan.name;
  document.getElementById('loanAmount').value = loan.amount;
  document.getElementById('emiDate').value = loan.emiDate;
  editIndex = index;
  document.getElementById('addBtn').textContent = "Update";
}

// Confirm Delete or Paid
function confirmAction(index, type){
  actionIndex = index;
  actionType = type;
  document.getElementById('modalBody').textContent = 
    type === 'delete' ? 'Are you sure you want to delete this loan?' : 'Mark this loan as paid?';
  const modal = new bootstrap.Modal(document.getElementById('confirmModal'));
  modal.show();
}

// Delete / Mark Paid action
document.getElementById('confirmBtn').addEventListener('click', function(){
  if(actionType === 'delete'){
    loans.splice(actionIndex, 1);
  } else if(actionType === 'paid'){
    loans[actionIndex].paid = true;
    loans[actionIndex].paidDate = new Date().toISOString().split('T')[0]; // save paid date
  }
  saveLoans();
  renderTable();
  const modalEl = bootstrap.Modal.getInstance(document.getElementById('confirmModal'));
  modalEl.hide();
});

// Paid button
function markPaid(index){
  confirmAction(index, 'paid');
}

// Disable past dates
document.getElementById('emiDate').setAttribute('min', new Date().toISOString().split('T')[0]);

// Initial load
loadLoans();
renderTable();
setInterval(renderTable, 60000);
