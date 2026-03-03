'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { customersApi, servicesApi, invoicesApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, Textarea, Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';

import { formatCurrency } from '@/lib/utils';
import { Plus, Trash2, ArrowLeft, FileText, User, List, ChevronRight } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone: string;
}

interface Service {
  id: string;
  name: string;
  price: number;
}

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface FormData {
  customerId: string;
  dueDate: string;
  notes: string;
  tax: number;
  discount: number;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const { addToast } = useToast();

  // All state declarations BEFORE any functions or effects
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    customerId: '',
    dueDate: '',
    notes: '',
    tax: 0,
    discount: 0,
  });
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: crypto.randomUUID(), description: '', quantity: 1, rate: 0, amount: 0 },
  ]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    loadData(ctrl);
    return () => ctrl.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async (ctrl: AbortController) => {
    try {
      const [customersRes, servicesRes] = await Promise.all([
        customersApi.getAll(),
        servicesApi.getAll(),
      ]);
      if (ctrl.signal.aborted) return;
      setCustomers(customersRes.data?.data || customersRes.data || []);
      setServices(servicesRes.data?.data || servicesRes.data || []);
    } catch (error: unknown) {
      if ((error as { name?: string }).name === 'CanceledError') return;
      addToast('error', 'Failed to load data');
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  };

  const addLineItem = () => {
    setLineItems((prev) => [...prev, { id: crypto.randomUUID(), description: '', quantity: 1, rate: 0, amount: 0 }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length === 1) {
      addToast('error', 'Invoice must have at least one line item');
      return;
    }
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    setLineItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === 'quantity' || field === 'rate') {
        updated[index].amount = Number(updated[index].quantity) * Number(updated[index].rate);
      }
      return updated;
    });
  };

  const addServiceAsLineItem = (serviceId: string) => {
    const service = services.find((s) => s.id === serviceId);
    if (service) {
      const newItem: LineItem = {
        id: crypto.randomUUID(),
        description: service.name,
        quantity: 1,
        rate: Number(service.price),
        amount: Number(service.price),
      };
      setLineItems((prev) => [...prev, newItem]);
    }
  };

  const calculateSubtotal = () =>
    lineItems.reduce((sum, item) => sum + Number(item.amount), 0);

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const taxAmount = (subtotal * Number(formData.tax)) / 100;
    return Math.max(0, subtotal + taxAmount - Number(formData.discount));
  };

  const handleSendClick = () => {
    void submitInvoice(true);
  };

  const handleSubmit = async (e: React.FormEvent, sendImmediately = false) => {
    e.preventDefault();
    await submitInvoice(sendImmediately);
  };

  const submitInvoice = async (sendImmediately: boolean) => {

    if (!formData.customerId) {
      addToast('error', 'Please select a customer');
      return;
    }
    if (lineItems.some((item) => !item.description || item.quantity <= 0 || item.rate < 0)) {
      addToast('error', 'Please fill all line item details correctly');
      return;
    }

    setSubmitting(true);
    try {
      const subtotal = calculateSubtotal();
      const taxAmount = (subtotal * Number(formData.tax)) / 100;

      const invoiceData = {
        customerId: formData.customerId,
        lineItems: lineItems.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity),
          rate: Number(item.rate),
          amount: Number(item.amount),
        })),
        subtotal,
        tax: taxAmount,
        discount: Number(formData.discount),
        total: calculateTotal(),
        dueDate: formData.dueDate || undefined,
        notes: formData.notes || undefined,
      };

      const response = await invoicesApi.create(invoiceData);
      const invoiceId = response.data?.id;
      if (!invoiceId) throw new Error('No invoice ID returned from server');

      if (sendImmediately) {
        await invoicesApi.send(invoiceId);
        addToast('success', 'Invoice created and sent successfully!');
      } else {
        addToast('success', 'Invoice created as draft');
      }

      router.push(`/invoices/${invoiceId}`);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      addToast('error', err.response?.data?.message || 'Failed to create invoice');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-40 w-full rounded-2xl" />
        <div className="skeleton h-64 w-full rounded-2xl" />
        <div className="skeleton h-64 w-full rounded-2xl" />
      </div>
    );
  }

  const subtotal = calculateSubtotal();
  const taxAmount = (subtotal * Number(formData.tax)) / 100;
  const total = calculateTotal();

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="h-10 w-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-0)] flex items-center justify-center hover:bg-[var(--surface-1)] transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4 text-[var(--foreground-secondary)]" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)] font-heading">
              Create New Invoice
            </h1>
            <p className="text-sm text-[var(--foreground-secondary)] mt-0.5 flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" />
              Invoices
              <ChevronRight className="h-3.5 w-3.5" />
              New Invoice
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>

      <form onSubmit={(e) => handleSubmit(e, false)}>
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">

            {/* Customer Selection */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="h-8 w-8 rounded-[var(--radius-md)] bg-[var(--primary)]/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-[var(--primary)]" />
                </div>
                <h2 className="text-base font-semibold text-[var(--foreground)]">Customer Information</h2>
              </div>
              <div>
              <Select
                  id="customer-select"
                  label="Select Customer"
                  required
                  value={formData.customerId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, customerId: e.target.value }))}
                  placeholder="-- Select Customer --"
                  options={customers.map((c) => ({ value: c.id, label: `${c.name} — ${c.phone}` }))}
                />
              </div>
            </Card>

            {/* Line Items */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-[var(--radius-md)] bg-[var(--primary)]/10 flex items-center justify-center">
                    <List className="h-4 w-4 text-[var(--primary)]" />
                  </div>
                  <h2 className="text-base font-semibold text-[var(--foreground)]">Line Items</h2>
                </div>
                <div className="flex items-center gap-2">
                  {services.length > 0 && (
                    <Select
                      aria-label="Add from services"
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          addServiceAsLineItem(e.target.value);
                        }
                      }}
                      placeholder="+ Add from Services"
                      options={services.map((s) => ({ value: s.id, label: `${s.name} — ${formatCurrency(Number(s.price))}` }))}
                      className="h-9 w-auto"
                    />
                  )}
                  <Button type="button" size="sm" variant="outline" onClick={addLineItem}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </div>
              </div>

              {/* Column Headers */}
              <div className="grid grid-cols-12 gap-3 mb-2 px-1">
                <div className="col-span-5 text-xs font-semibold uppercase tracking-wider text-[var(--foreground-tertiary)]">Description</div>
                <div className="col-span-2 text-xs font-semibold uppercase tracking-wider text-[var(--foreground-tertiary)]">Qty</div>
                <div className="col-span-2 text-xs font-semibold uppercase tracking-wider text-[var(--foreground-tertiary)]">Rate</div>
                <div className="col-span-2 text-xs font-semibold uppercase tracking-wider text-[var(--foreground-tertiary)] text-right">Amount</div>
                <div className="col-span-1" />
              </div>

              <div className="space-y-3">
                {lineItems.map((item, index) => (
                  <div key={item.id} className="grid grid-cols-12 gap-3 items-center p-3 rounded-[var(--radius-md)] bg-[var(--surface-0)] border border-[var(--border)] hover:border-[var(--primary)]/30 transition-colors">
                    <div className="col-span-5">
                      <Input
                        id={`desc-${index}`}
                        type="text"
                        placeholder="e.g. Wedding Photography"
                        required
                        value={item.description}
                        onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                        aria-label={`Description for item ${index + 1}`}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        id={`qty-${index}`}
                        type="number"
                        placeholder="1"
                        required
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(index, 'quantity', Number(e.target.value))}
                        aria-label={`Quantity for item ${index + 1}`}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        id={`rate-${index}`}
                        type="number"
                        placeholder="0"
                        required
                        min="0"
                        step="0.01"
                        value={item.rate}
                        onChange={(e) => updateLineItem(index, 'rate', Number(e.target.value))}
                        aria-label={`Rate for item ${index + 1}`}
                      />
                    </div>
                    <div className="col-span-2">
                      <div className="px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--surface-2)] border border-[var(--border)] text-sm font-semibold text-[var(--foreground)] text-right tabular-nums">
                        {formatCurrency(item.amount)}
                      </div>
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <button
                        type="button"
                        onClick={() => removeLineItem(index)}
                        aria-label={`Remove item ${index + 1}`}
                        className="h-8 w-8 rounded-[var(--radius-sm)] text-[var(--danger)] hover:bg-[var(--danger)]/10 flex items-center justify-center transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Additional Details */}
            <Card className="p-6">
              <h2 className="text-base font-semibold text-[var(--foreground)] mb-5">Additional Details</h2>
              <div className="space-y-4">
                <div>
                  <Input
                    id="due-date"
                    type="date"
                    label="Due Date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, dueDate: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                    helperText="Optional"
                  />
                </div>

                <div>
                  <Textarea
                    id="notes"
                    label="Notes"
                    value={formData.notes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                    rows={4}
                    placeholder="Payment terms, special instructions, etc."
                    helperText="Optional"
                  />
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar — Invoice Summary */}
          <div>
            <div className="sticky top-6 space-y-4">
              <Card className="p-6">
                <h2 className="text-base font-semibold text-[var(--foreground)] mb-5">Invoice Summary</h2>

                <div className="space-y-4">
                  {/* Subtotal */}
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--foreground-secondary)]">Subtotal</span>
                    <span className="font-semibold text-[var(--foreground)] tabular-nums">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>

                  {/* Tax */}
                  <div className="space-y-1.5">
                    <Input
                      id="tax-input"
                      type="number"
                      label="Tax (%)"
                      min="0"
                      max="100"
                      step="0.01"
                      value={formData.tax}
                      onChange={(e) => setFormData((prev) => ({ ...prev, tax: Number(e.target.value) }))}
                      className="text-right tabular-nums"
                    />
                    {formData.tax > 0 && (
                      <div className="flex justify-between text-xs text-[var(--foreground-tertiary)]">
                        <span>Tax amount</span>
                        <span className="tabular-nums">{formatCurrency(taxAmount)}</span>
                      </div>
                    )}
                  </div>

                  {/* Discount */}
                  <div className="space-y-1.5">
                    <Input
                      id="discount-input"
                      type="number"
                      label="Discount (Fixed Amount)"
                      min="0"
                      step="0.01"
                      value={formData.discount}
                      onChange={(e) => setFormData((prev) => ({ ...prev, discount: Number(e.target.value) }))}
                      className="text-right tabular-nums"
                    />
                  </div>

                  {/* Divider */}
                  <div className="border-t border-[var(--border)] pt-4">
                    <div className="flex justify-between">
                      <span className="text-base font-bold text-[var(--foreground)]">Total</span>
                      <span className="text-xl font-black text-[var(--primary)] tabular-nums">
                        {formatCurrency(total)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 space-y-2">
                  <Button
                    type="submit"
                    className="w-full"
                    isLoading={submitting}
                    disabled={submitting}
                  >
                    Save as Draft
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    isLoading={submitting}
                    disabled={submitting}
                    onClick={handleSendClick}
                  >
                    Create &amp; Send
                  </Button>
                </div>

                <div className="mt-4 p-3 rounded-[var(--radius-md)] bg-[var(--primary)]/5 border border-[var(--primary)]/15 text-xs text-[var(--foreground-secondary)]">
                  <strong className="text-[var(--foreground)]">Tip:</strong> &quot;Save as Draft&quot; creates
                  the invoice without sending. &quot;Create &amp; Send&quot; emails it immediately.
                </div>
              </Card>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
