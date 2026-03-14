const val = "150.00";
try {
const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
console.log('Formatted:', formatted);
} catch (e) {
    console.log('Error:', e.message);
}
