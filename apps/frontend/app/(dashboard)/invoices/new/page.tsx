'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { customersApi, servicesApi, invoicesApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { Plus, Trash2 } from 'lucide-react';

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
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    customerId: '',
    dueDate: '',
    notes: '',
    tax: 0,
    discount: 0,
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: '', quantity: 1, rate: 0, amount: 0 },
  ]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [customersRes, servicesRes] = await Promise.all([
        customersApi.getAll(),
        servicesApi.getAll(),
      ]);
      setCustomers(customersRes.data);
      setServices(servicesRes.data);
    } catch (error: any) {
      addToast('error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: 1, rate: 0, amount: 0 }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length === 1) {
      addToast('error', 'Invoice must have at least one line item');
      return;
    }
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    
    // Recalculate amount
    if (field === 'quantity' || field === 'rate') {
      updated[index].amount = updated[index].quantity * updated[index].rate;
    }
    
    setLineItems(updated);
  };

  const addServiceAsLineItem = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (service) {
      const newItem: LineItem = {
        description: service.name,
        quantity: 1,
        rate: Number(service.price),
        amount: Number(service.price),
      };
      setLineItems([...lineItems, newItem]);
    }
  };

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + Number(item.amount), 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const taxAmount = (subtotal * Number(formData.tax)) / 100;
    const total = subtotal + taxAmount - Number(formData.discount);
    return Math.max(0, total);
  };

  const handleSubmit = async (e: React.FormEvent, sendImmediately = false) => {
    e.preventDefault();

    if (!formData.customerId) {
      addToast('error', 'Please select a customer');
      return;
    }

    if (lineItems.some(item => !item.description || item.quantity <= 0 || item.rate < 0)) {
      addToast('error', 'Please fill all line item details correctly');
      return;
    }

    setSubmitting(true);
    try {
      const subtotal = calculateSubtotal();
      const taxAmount = (subtotal * Number(formData.tax)) / 100;

      const invoiceData = {
        customerId: formData.customerId,
        lineItems: lineItems.map(item => ({
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
      const invoiceId = response.data.id;

      if (sendImmediately) {
        await invoicesApi.send(invoiceId);
        addToast('success', 'Invoice created and sent successfully!');
      } else {
        addToast('success', 'Invoice created as draft');
      }

      router.push(`/invoices/${invoiceId}`);
    } catch (error: any) {
      addToast('error', error.response?.data?.message || 'Failed to create invoice');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Create New Invoice</h1>
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
              <h2 className="text-lg font-semibold mb-4">Customer Information</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Customer <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.customerId}
                  onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">-- Select Customer --</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} - {customer.phone}
                    </option>
                  ))}
                </select>
              </div>
            </Card>

            {/* Line Items */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Line Items</h2>
                <div className="flex gap-2">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        addServiceAsLineItem(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-lg"
                  >
                    <option value="">+ Add from Services</option>
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name} - ${Number(service.price).toFixed(2)}
                      </option>
                    ))}
                  </select>
                  <Button type="button" size="sm" onClick={addLineItem}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {lineItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-3 items-start">
                    <div className="col-span-5">
                      <input
                        type="text"
                        placeholder="Description"
                        required
                        value={item.description}
                        onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        placeholder="Qty"
                        required
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(index, 'quantity', Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        placeholder="Rate"
                        required
                        min="0"
                        step="0.01"
                        value={item.rate}
                        onChange={(e) => updateLineItem(index, 'rate', Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="col-span-2">
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-right">
                        ${item.amount.toFixed(2)}
                      </div>
                    </div>
                    <div className="col-span-1">
                      <button
                        type="button"
                        onClick={() => removeLineItem(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
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
              <h2 className="text-lg font-semibold mb-4">Additional Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Due Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Payment terms, special instructions, etc."
                  />
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar - Invoice Summary */}
          <div className="space-y-6">
            <Card className="p-6 sticky top-6">
              <h2 className="text-lg font-semibold mb-4">Invoice Summary</h2>
              
              <div className="space-y-3">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal:</span>
                  <span className="font-medium">${calculateSubtotal().toFixed(2)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-gray-600">Tax (%):</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.tax}
                    onChange={(e) => setFormData({ ...formData, tax: Number(e.target.value) })}
                    className="w-24 px-3 py-1 border border-gray-300 rounded text-right"
                  />
                </div>

                {formData.tax > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Tax Amount:</span>
                    <span className="font-medium">
                      ${((calculateSubtotal() * Number(formData.tax)) / 100).toFixed(2)}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <label className="text-gray-600">Discount ($):</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.discount}
                    onChange={(e) => setFormData({ ...formData, discount: Number(e.target.value) })}
                    className="w-24 px-3 py-1 border border-gray-300 rounded text-right"
                  />
                </div>

                <div className="flex justify-between text-xl font-bold pt-3 border-t">
                  <span>Total:</span>
                  <span className="text-blue-600">${calculateTotal().toFixed(2)}</span>
                </div>
              </div>

              <div className="mt-6 space-y-2">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={submitting}
                >
                  {submitting ? 'Creating...' : 'Save as Draft'}
                </Button>
                <Button
                  type="button"
                  onClick={(e) => handleSubmit(e as any, true)}
                  className="w-full"
                  disabled={submitting}
                  variant="outline"
                >
                  Create & Send
                </Button>
              </div>

              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
                <strong>Note:</strong> "Save as Draft" will create the invoice without sending it to the customer. 
                "Create & Send" will immediately email the invoice.
              </div>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
