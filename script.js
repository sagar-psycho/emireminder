let loans = [];
let editIndex = null;
let actionIndex = null;
let actionType = ''; // "delete" or "paid"

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

// Render table
function renderTable() {
  const tbody = document.querySelector('#loanTable tbody');
  tbody.innerHTML = '';
  const today = new Date().toISOString().split('T')[0];

  let totalPaid = 0;
  let totalDue = 0;

  // Sort loans: unpaid first (by EMI date), then paid
  loans.sort((a, b) => {
    if (a.paid === b.paid) {
      return new Date(a.emiDate) - new Date(b.emiDate);
    }
    return a.paid ? 1 : -1; // unpaid (-1) before paid (1)
  });

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
      <td>${daysLeft < 0 ? 'Overdue' : daysLeft + ' day(s)'}</td>
      <td>${loan.paid ? 'Paid' : 'Pending'}</td>
      <td>
        <button class="btn btn-success btn-sm me-1" onclick="markPaid(${index})" ${loan.paid ? 'disabled' : ''}>Paid</button>
        <button class="btn btn-warning btn-sm me-1" onclick="editLoan(${index})">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="confirmAction(${index}, 'delete')">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);

    // Remind 1-3 days before EMI
    if(!loan.paid && daysLeft >= 0 && daysLeft <= 3){
      showToast(`${loan.name} EMI due in ${daysLeft} day(s)`);
    }
  });

  // Add total row at the bottom
  const totalRow = document.createElement('tr');
  totalRow.classList.add('table-secondary');
  totalRow.innerHTML = `
    <td colspan="1"><strong>Totals</strong></td>
    <td><strong>Paid: ${totalPaid.toFixed(2)}</strong></td>
    <td><strong>Due: ${totalDue.toFixed(2)}</strong></td>
    <td colspan="3"></td>
  `;
  tbody.appendChild(totalRow);
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

  // Validate EMI date is not in the past
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

// Disable past dates in date picker
document.getElementById('emiDate').setAttribute('min', new Date().toISOString().split('T')[0]);

// Initial load
loadLoans();
renderTable();

// Auto-update table every minute
setInterval(renderTable, 60000);
