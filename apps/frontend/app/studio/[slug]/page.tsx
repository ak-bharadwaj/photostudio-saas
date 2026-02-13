'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadingPage } from '@/components/ui/loading';
import { useToast } from '@/components/ui/toast';
import { Calendar, Clock, Mail, Phone, MapPin, Check } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface Service {
  id: string;
  name: string;
  description?: string;
  price: number;
  durationMinutes: number;
}

interface PortfolioItem {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  category?: string;
}

interface Studio {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string;
  logoUrl?: string;
  brandingConfig?: any;
  services: Service[];
  portfolioItems: PortfolioItem[];
}

interface TimeSlot {
  time: string;
  available: boolean;
}

export default function PublicBookingPage() {
  const params = useParams();
  const { addToast } = useToast();
  const [studio, setStudio] = useState<Studio | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1); // 1: Service, 2: DateTime, 3: Customer Info, 4: Confirmation
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingId, setBookingId] = useState('');
  const [customerData, setCustomerData] = useState({
    name: '',
    email: '',
    phone: '',
    notes: '',
  });

  useEffect(() => {
    loadStudio();
  }, [params.slug]);

  const loadStudio = async () => {
    try {
      const response = await axios.get(`${API_URL}/public/studios/${params.slug}`);
      setStudio(response.data);
    } catch (error: any) {
      addToast('error', error.response?.data?.message || 'Studio not found');
    } finally {
      setLoading(false);
    }
  };

  const loadTimeSlots = async (serviceId: string, date: string) => {
    setLoadingSlots(true);
    try {
      const response = await axios.get(
        `${API_URL}/public/studios/${params.slug}/services/${serviceId}/available-slots`,
        { params: { date } }
      );
      setTimeSlots(response.data.slots || []);
    } catch (error: any) {
      addToast('error', 'Failed to load available time slots');
      setTimeSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    setStep(2);
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setSelectedTime('');
    if (selectedService && date) {
      loadTimeSlots(selectedService.id, date);
    }
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedService || !selectedTime || !customerData.name || !customerData.phone) {
      addToast('error', 'Please fill all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.post(
        `${API_URL}/public/studios/${params.slug}/bookings`,
        {
          customerName: customerData.name,
          customerEmail: customerData.email || undefined,
          customerPhone: customerData.phone,
          serviceId: selectedService.id,
          scheduledAt: selectedTime,
          customerNotes: customerData.notes || undefined,
        }
      );
      
      setBookingId(response.data.id);
      setStep(4);
      addToast('success', 'Booking request submitted successfully!');
    } catch (error: any) {
      addToast('error', error.response?.data?.message || 'Failed to submit booking');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingPage message="Loading studio..." />;
  if (!studio) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Studio Not Found</h1>
        <p className="text-gray-600">The studio you're looking for doesn't exist or is not accepting bookings.</p>
      </div>
    </div>
  );

  const minDate = new Date().toISOString().split('T')[0];
  const maxDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 90 days ahead

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            {studio.logoUrl && (
              <img src={studio.logoUrl} alt={studio.name} className="h-12 w-12 rounded-full object-cover" />
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{studio.name}</h1>
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  {studio.email}
                </div>
                <div className="flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  {studio.phone}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2">
            {[
              { num: 1, label: 'Select Service' },
              { num: 2, label: 'Choose Date & Time' },
              { num: 3, label: 'Your Information' },
              { num: 4, label: 'Confirmation' },
            ].map((s, idx) => (
              <div key={s.num} className="flex items-center">
                <div className={`flex items-center gap-2 ${step >= s.num ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                    step >= s.num ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {step > s.num ? <Check className="h-5 w-5" /> : s.num}
                  </div>
                  <span className="hidden sm:inline text-sm font-medium">{s.label}</span>
                </div>
                {idx < 3 && <div className={`w-12 h-1 mx-2 ${step > s.num ? 'bg-blue-600' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Select Service */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Select a Service</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {studio.services.map((service) => (
                <Card key={service.id} className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleServiceSelect(service)}>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{service.name}</h3>
                  {service.description && (
                    <p className="text-gray-600 text-sm mb-4">{service.description}</p>
                  )}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div className="flex items-center gap-1 text-gray-600">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm">{service.durationMinutes} min</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      ${Number(service.price).toFixed(0)}
                    </div>
                  </div>
                  <Button className="w-full mt-4">Select</Button>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Select Date & Time */}
        {step === 2 && selectedService && (
          <div>
            <div className="mb-6">
              <button onClick={() => setStep(1)} className="text-blue-600 hover:underline text-sm">
                ← Change Service
              </button>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Choose Date & Time</h2>
            <div className="max-w-2xl mx-auto">
              <Card className="p-6 mb-6">
                <h3 className="font-semibold text-gray-900 mb-4">Selected Service</h3>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="font-semibold text-lg text-blue-900">{selectedService.name}</div>
                  <div className="flex items-center gap-4 mt-2 text-sm text-blue-700">
                    <span>{selectedService.durationMinutes} minutes</span>
                    <span className="font-bold">${Number(selectedService.price).toFixed(2)}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    min={minDate}
                    max={maxDate}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {selectedDate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Time
                    </label>
                    {loadingSlots ? (
                      <div className="text-center py-8 text-gray-500">Loading available times...</div>
                    ) : timeSlots.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No available time slots for this date. Please select another date.
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-3">
                        {timeSlots.map((slot) => (
                          <button
                            key={slot.time}
                            onClick={() => handleTimeSelect(slot.time)}
                            disabled={!slot.available}
                            className={`px-4 py-2 rounded-lg border font-medium transition-colors ${
                              selectedTime === slot.time
                                ? 'bg-blue-600 text-white border-blue-600'
                                : slot.available
                                ? 'bg-white text-gray-900 border-gray-300 hover:border-blue-500'
                                : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                            }`}
                          >
                            {new Date(slot.time).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {selectedTime && (
                  <Button className="w-full mt-6" onClick={() => setStep(3)}>
                    Continue to Contact Information
                  </Button>
                )}
              </Card>
            </div>
          </div>
        )}

        {/* Step 3: Customer Information */}
        {step === 3 && (
          <div>
            <div className="mb-6">
              <button onClick={() => setStep(2)} className="text-blue-600 hover:underline text-sm">
                ← Change Date & Time
              </button>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Information</h2>
            <div className="max-w-2xl mx-auto">
              <Card className="p-6 mb-6">
                <h3 className="font-semibold text-gray-900 mb-4">Booking Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Service:</span>
                    <span className="font-medium">{selectedService?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-medium">
                      {new Date(selectedDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Time:</span>
                    <span className="font-medium">
                      {new Date(selectedTime).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium">{selectedService?.durationMinutes} minutes</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>Total:</span>
                    <span className="text-blue-600">${Number(selectedService?.price).toFixed(2)}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <form onSubmit={handleSubmitBooking} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={customerData.name}
                      onChange={(e) => setCustomerData({ ...customerData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email (Optional)
                    </label>
                    <input
                      type="email"
                      value={customerData.email}
                      onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="john@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={customerData.phone}
                      onChange={(e) => setCustomerData({ ...customerData, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="+1 234 567 8900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Additional Notes (Optional)
                    </label>
                    <textarea
                      value={customerData.notes}
                      onChange={(e) => setCustomerData({ ...customerData, notes: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Any special requests or requirements..."
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Submit Booking Request'}
                  </Button>
                </form>
              </Card>
            </div>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === 4 && (
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-green-50 border-2 border-green-200 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
              <Check className="h-12 w-12 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Booking Request Submitted!</h2>
            <p className="text-gray-600 mb-2">
              Thank you for your booking request. We've received your information and will contact you shortly to confirm your appointment.
            </p>
            <p className="text-sm text-gray-500 mb-8">
              Booking ID: <span className="font-mono font-semibold">{bookingId}</span>
            </p>

            <Card className="p-6 text-left mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">Booking Details</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <div className="text-sm text-gray-600">Date & Time</div>
                    <div className="font-medium">
                      {new Date(selectedTime).toLocaleString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <div className="text-sm text-gray-600">Service</div>
                    <div className="font-medium">{selectedService?.name}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <div className="text-sm text-gray-600">Contact</div>
                    <div className="font-medium">{customerData.phone}</div>
                    {customerData.email && <div className="text-sm text-gray-500">{customerData.email}</div>}
                  </div>
                </div>
              </div>
            </Card>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
              <strong>What happens next?</strong>
              <p className="mt-1">
                The studio will review your booking and contact you at {customerData.phone} to confirm availability and provide any additional details.
              </p>
            </div>

            <Button 
              variant="outline" 
              className="mt-6"
              onClick={() => {
                setStep(1);
                setSelectedService(null);
                setSelectedDate('');
                setSelectedTime('');
                setBookingId('');
                setCustomerData({ name: '', email: '', phone: '', notes: '' });
              }}
            >
              Book Another Session
            </Button>
          </div>
        )}

        {/* Portfolio Section */}
        {step === 1 && studio.portfolioItems.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Our Work</h2>
            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
              {studio.portfolioItems.map((item) => (
                <div key={item.id} className="relative group overflow-hidden rounded-lg aspect-square">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                      <div className="font-semibold">{item.title}</div>
                      {item.category && (
                        <div className="text-xs text-gray-200">{item.category}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-white border-t mt-16 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-gray-600 text-sm">
          <p>&copy; {new Date().getFullYear()} {studio.name}. All rights reserved.</p>
          <div className="flex items-center justify-center gap-4 mt-2">
            <a href={`mailto:${studio.email}`} className="hover:text-blue-600">
              {studio.email}
            </a>
            <span>•</span>
            <a href={`tel:${studio.phone}`} className="hover:text-blue-600">
              {studio.phone}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
