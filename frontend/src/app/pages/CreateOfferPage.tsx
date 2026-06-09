import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useOffers, StayType, ApartmentType, PermissionStatus, GenderBreakdown, PriceBreakdown, OfferSpecifics } from '../context/OffersContext';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';

interface OfferFormData {
  stayType: StayType | null;
  apartmentType: ApartmentType | null;
  name: string;
  address: string;
  moveInDate: string;
  area: string;
  priceBreakdown: PriceBreakdown;
  genderBreakdown: GenderBreakdown;
  specifics: OfferSpecifics;
  description: string;
  images: string[];
}

export function CreateOfferPage() {
  const navigate = useNavigate();
  const { addOffer } = useOffers();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<OfferFormData>({
    stayType: null,
    apartmentType: null,
    name: '',
    address: '',
    moveInDate: '',
    area: '',
    priceBreakdown: { kaltmiete: 0, nebenkosten: 0, kaution: 0, ablose: 0, sonstiges: 0 },
    genderBreakdown: { males: 0, females: 0, diverse: 0 },
    specifics: {
      pets: 'not-allowed',
      smoking: 'not-allowed',
      parties: 'maybe',
      instruments: 'maybe',
      visitors: 'allowed',
    },
    description: '',
    images: [],
  });

  const totalSteps = 10;

  const canProceed = () => {
    switch (currentStep) {
      case 1: return formData.stayType !== null;
      case 2: return formData.apartmentType !== null;
      case 3: return formData.name.trim() !== '';
      case 4: return formData.address.trim() !== '' && formData.moveInDate !== '';
      case 5: return true;
      case 6: return true;
      case 7: return true;
      case 8: return formData.description.trim() !== '';
      case 9: return true;
      case 10: return true;
      default: return false;
    }
  };

  const handleNext = () => {
    if (canProceed() && currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!formData.stayType || !formData.apartmentType) return;

    const totalPrice = formData.priceBreakdown.kaltmiete + formData.priceBreakdown.nebenkosten;

    // Use async/await to wait for the backend database to save the object
    try {
      await addOffer({
        name: formData.name,
        address: formData.address,
        stayType: formData.stayType,
        apartmentType: formData.apartmentType,
        moveInDate: formData.moveInDate,
        area: Number(formData.area) || 0,
        description: formData.description,
        images: formData.images.length > 0 ? formData.images : ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'],
        genderBreakdown: formData.genderBreakdown,
        priceBreakdown: formData.priceBreakdown,
        totalPrice,
        specifics: formData.specifics,
        contactEmail: user?.email || 'dummy@oth-regensburg.de', // Fallback email
        createdBy: user?.id || '1', // Matches our hardcoded backend ownerId
      });

      // Only navigate back to the main feed once the backend saves successfully
      navigate('/');
    } catch (error) {
      console.error("Failed to post offer:", error);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <StepStayType
            value={formData.stayType}
            onChange={(stayType) => setFormData(prev => ({ ...prev, stayType }))}
          />
        );
      case 2:
        return (
          <StepApartmentType
            value={formData.apartmentType}
            onChange={(apartmentType) => setFormData(prev => ({ ...prev, apartmentType }))}
          />
        );
      case 3:
        return (
          <StepName
            value={formData.name}
            onChange={(name) => setFormData(prev => ({ ...prev, name }))}
          />
        );
      case 4:
        return (
          <StepLocation
            address={formData.address}
            moveInDate={formData.moveInDate}
            area={formData.area}
            onChange={(field, value) => setFormData(prev => ({ ...prev, [field]: value }))}
          />
        );
      case 5:
        return (
          <StepPricing
            priceBreakdown={formData.priceBreakdown}
            onChange={(priceBreakdown) => setFormData(prev => ({ ...prev, priceBreakdown }))}
          />
        );
      case 6:
        return (
          <StepGenderBreakdown
            genderBreakdown={formData.genderBreakdown}
            onChange={(genderBreakdown) => setFormData(prev => ({ ...prev, genderBreakdown }))}
          />
        );
      case 7:
        return (
          <StepSpecifics
            specifics={formData.specifics}
            onChange={(specifics) => setFormData(prev => ({ ...prev, specifics }))}
          />
        );
      case 8:
        return (
          <StepDescription
            value={formData.description}
            onChange={(description) => setFormData(prev => ({ ...prev, description }))}
          />
        );
      case 9:
        return (
          <StepPhotos
            images={formData.images}
            onChange={(images) => setFormData(prev => ({ ...prev, images }))}
          />
        );
      case 10:
        return <StepReview formData={formData} />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Offer</h1>
        <p className="text-gray-600">Step {currentStep} of {totalSteps}</p>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-2">
          {Array.from({ length: totalSteps }).map((_, index) => (
            <div
              key={index}
              className={`h-2 flex-1 rounded-full transition-colors ${
                index < currentStep ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-8 mb-6">
        {renderStepContent()}
      </div>

      <div className="flex justify-between">
        <button
          onClick={currentStep === 1 ? () => navigate('/') : handleBack}
          className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
        >
          <ArrowLeft size={20} />
          {currentStep === 1 ? 'Cancel' : 'Back'}
        </button>

        {currentStep < totalSteps ? (
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            Next
            <ArrowRight size={20} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            <Check size={20} />
            Post Offer
          </button>
        )}
      </div>
    </div>
  );
}

function StepStayType({ value, onChange }: { value: StayType | null; onChange: (value: StayType) => void }) {
  const options: { value: StayType; label: string; description: string }[] = [
    { value: 'zwischenmiete', label: 'Zwischenmiete', description: 'Temporary sublet for a fixed period' },
    { value: 'nachmieter', label: 'Nachmieter', description: 'Looking for a permanent successor' },
    { value: 'couchsurfing', label: 'Couchsurfing', description: 'Short-term free accommodation' },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">What type of stay are you offering?</h2>
      <p className="text-gray-600 mb-6">Choose the category that best describes your offer</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`p-6 rounded-lg border-2 text-left transition-all ${
              value === option.value
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <h3 className="font-semibold text-lg text-gray-900 mb-2">{option.label}</h3>
            <p className="text-sm text-gray-600">{option.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepApartmentType({ value, onChange }: { value: ApartmentType | null; onChange: (value: ApartmentType) => void }) {
  const options: { value: ApartmentType; label: string; description: string }[] = [
    { value: 'WG', label: 'WG Room', description: 'Room in a shared apartment' },
    { value: 'studio', label: 'Studio', description: 'Self-contained studio apartment' },
    { value: 'apartment', label: 'Apartment', description: 'Full apartment' },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">What type of accommodation?</h2>
      <p className="text-gray-600 mb-6">Select the apartment type</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`p-6 rounded-lg border-2 text-left transition-all ${
              value === option.value
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <h3 className="font-semibold text-lg text-gray-900 mb-2">{option.label}</h3>
            <p className="text-sm text-gray-600">{option.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepName({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Give your offer a name</h2>
      <p className="text-gray-600 mb-6">Create a catchy title that describes your accommodation</p>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g., Cozy WG Room in City Center"
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-lg"
        autoFocus
      />
    </div>
  );
}

function StepLocation({
  address,
  moveInDate,
  area,
  onChange,
}: {
  address: string;
  moveInDate: string;
  area: string;
  onChange: (field: string, value: string) => void;
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Location details</h2>
      <p className="text-gray-600 mb-6">Where is your accommodation located?</p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Full Address *
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => onChange('address', e.target.value)}
            placeholder="Street, Postal Code, City"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Move-in Date *
          </label>
          <input
            type="date"
            value={moveInDate}
            onChange={(e) => onChange('moveInDate', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Area (m²) - Optional
          </label>
          <input
            type="number"
            value={area}
            onChange={(e) => onChange('area', e.target.value)}
            placeholder="18"
            min="0"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
      </div>
    </div>
  );
}

function StepPricing({
  priceBreakdown,
  onChange,
}: {
  priceBreakdown: PriceBreakdown;
  onChange: (value: PriceBreakdown) => void;
}) {
  const updateField = (field: keyof PriceBreakdown, value: string) => {
    onChange({ ...priceBreakdown, [field]: Number(value) || 0 });
  };

  const total = priceBreakdown.kaltmiete + priceBreakdown.nebenkosten;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Price breakdown</h2>
      <p className="text-gray-600 mb-6">Enter all cost details (use 0 for free/couchsurfing)</p>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kaltmiete (€)
            </label>
            <input
              type="number"
              value={priceBreakdown.kaltmiete}
              onChange={(e) => updateField('kaltmiete', e.target.value)}
              min="0"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nebenkosten (€)
            </label>
            <input
              type="number"
              value={priceBreakdown.nebenkosten}
              onChange={(e) => updateField('nebenkosten', e.target.value)}
              min="0"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kaution (€)
            </label>
            <input
              type="number"
              value={priceBreakdown.kaution}
              onChange={(e) => updateField('kaution', e.target.value)}
              min="0"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ablöse (€) - Optional
            </label>
            <input
              type="number"
              value={priceBreakdown.ablose || 0}
              onChange={(e) => updateField('ablose', e.target.value)}
              min="0"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sonstiges (€) - Optional
            </label>
            <input
              type="number"
              value={priceBreakdown.sonstiges || 0}
              onChange={(e) => updateField('sonstiges', e.target.value)}
              min="0"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="font-medium text-gray-700">Total Monthly Rent:</span>
            <span className="text-2xl font-bold text-blue-600">€{total}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepGenderBreakdown({
  genderBreakdown,
  onChange,
}: {
  genderBreakdown: GenderBreakdown;
  onChange: (value: GenderBreakdown) => void;
}) {
  const updateField = (field: keyof GenderBreakdown, value: string) => {
    onChange({ ...genderBreakdown, [field]: Number(value) || 0 });
  };

  const total = genderBreakdown.males + genderBreakdown.females + genderBreakdown.diverse;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Gender breakdown in WG</h2>
      <p className="text-gray-600 mb-6">How many people of each gender live in the apartment? (Leave at 0 for studio/single apartments)</p>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Males
            </label>
            <input
              type="number"
              value={genderBreakdown.males}
              onChange={(e) => updateField('males', e.target.value)}
              min="0"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Females
            </label>
            <input
              type="number"
              value={genderBreakdown.females}
              onChange={(e) => updateField('females', e.target.value)}
              min="0"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Diverse
            </label>
            <input
              type="number"
              value={genderBreakdown.diverse}
              onChange={(e) => updateField('diverse', e.target.value)}
              min="0"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
        </div>

        {total > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <span className="text-sm text-gray-600">Total tenants: </span>
            <span className="font-semibold text-gray-900">{total}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function StepSpecifics({
  specifics,
  onChange,
}: {
  specifics: OfferSpecifics;
  onChange: (value: OfferSpecifics) => void;
}) {
  const updateField = (field: keyof OfferSpecifics, value: PermissionStatus) => {
    onChange({ ...specifics, [field]: value });
  };

  const categories: { field: keyof OfferSpecifics; label: string }[] = [
    { field: 'pets', label: 'Pets' },
    { field: 'smoking', label: 'Smoking' },
    { field: 'parties', label: 'Parties' },
    { field: 'instruments', label: 'Musical Instruments' },
    { field: 'visitors', label: 'Overnight Visitors' },
  ];

  const options: { value: PermissionStatus; label: string; color: string }[] = [
    { value: 'allowed', label: 'Allowed', color: 'bg-green-100 text-green-800 border-green-300' },
    { value: 'maybe', label: 'Maybe', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
    { value: 'not-allowed', label: 'Not Allowed', color: 'bg-red-100 text-red-800 border-red-300' },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">House rules & specifics</h2>
      <p className="text-gray-600 mb-6">Set the rules for your accommodation</p>

      <div className="space-y-6">
        {categories.map((category) => (
          <div key={category.field}>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              {category.label}
            </label>
            <div className="grid grid-cols-3 gap-3">
              {options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateField(category.field, option.value)}
                  className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    specifics[category.field] === option.value
                      ? option.color + ' border-current'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepDescription({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Add a description</h2>
      <p className="text-gray-600 mb-6">Describe your accommodation, the neighborhood, and what makes it special</p>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={10}
        placeholder="Tell potential tenants about the room, amenities, location, public transport access, nearby facilities, the people in the WG, and anything else that would help them make a decision..."
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
        autoFocus
      />

      <p className="text-sm text-gray-500 mt-2">{value.length} characters</p>
    </div>
  );
}

function StepPhotos({ images, onChange }: { images: string[]; onChange: (value: string[]) => void }) {
  const [imageInput, setImageInput] = useState('');

  const addImage = () => {
    if (imageInput.trim()) {
      onChange([...images, imageInput.trim()]);
      setImageInput('');
    }
  };

  const removeImage = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Add photos</h2>
      <p className="text-gray-600 mb-6">Upload images to showcase your accommodation (optional, default image will be used if none provided)</p>

      <div className="space-y-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={imageInput}
            onChange={(e) => setImageInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addImage()}
            placeholder="Paste image URL and press Enter"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
          <button
            onClick={addImage}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Add
          </button>
        </div>

        {images.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {images.map((image, index) => (
              <div key={index} className="relative group">
                <img
                  src={image}
                  alt={`Upload ${index + 1}`}
                  className="w-full aspect-square object-cover rounded-lg"
                />
                <button
                  onClick={() => removeImage(index)}
                  className="absolute top-2 right-2 w-8 h-8 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="text-sm text-gray-500">
          {images.length} {images.length === 1 ? 'image' : 'images'} added
        </p>
      </div>
    </div>
  );
}

function StepReview({ formData }: { formData: OfferFormData }) {
  const totalPrice = formData.priceBreakdown.kaltmiete + formData.priceBreakdown.nebenkosten;
  const totalTenants = formData.genderBreakdown.males + formData.genderBreakdown.females + formData.genderBreakdown.diverse;

  const getStayTypeLabel = (type: StayType | null) => {
    if (!type) return '';
    const labels = { zwischenmiete: 'Zwischenmiete', nachmieter: 'Nachmieter', couchsurfing: 'Couchsurfing' };
    return labels[type];
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Review your offer</h2>
      <p className="text-gray-600 mb-6">Please check all details before posting</p>

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm text-gray-600 mb-1">Stay Type</p>
            <p className="font-medium text-gray-900">{getStayTypeLabel(formData.stayType)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Apartment Type</p>
            <p className="font-medium text-gray-900">{formData.apartmentType}</p>
          </div>
        </div>

        <div>
          <p className="text-sm text-gray-600 mb-1">Name</p>
          <p className="font-medium text-gray-900 text-lg">{formData.name}</p>
        </div>

        <div>
          <p className="text-sm text-gray-600 mb-1">Address</p>
          <p className="font-medium text-gray-900">{formData.address}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">Move-in Date</p>
            <p className="font-medium text-gray-900">
              {new Date(formData.moveInDate).toLocaleDateString('de-DE')}
            </p>
          </div>
          {formData.area && (
            <div>
              <p className="text-sm text-gray-600 mb-1">Area</p>
              <p className="font-medium text-gray-900">{formData.area} m²</p>
            </div>
          )}
        </div>

        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-700 mb-2">Price Breakdown</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Kaltmiete:</span>
              <span className="font-medium">€{formData.priceBreakdown.kaltmiete}</span>
            </div>
            <div className="flex justify-between">
              <span>Nebenkosten:</span>
              <span className="font-medium">€{formData.priceBreakdown.nebenkosten}</span>
            </div>
            <div className="flex justify-between">
              <span>Kaution:</span>
              <span className="font-medium">€{formData.priceBreakdown.kaution}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-blue-200">
              <span className="font-medium">Total Monthly:</span>
              <span className="font-bold text-lg">€{totalPrice}</span>
            </div>
          </div>
        </div>

        {totalTenants > 0 && (
          <div>
            <p className="text-sm text-gray-600 mb-1">Gender Breakdown</p>
            <p className="font-medium text-gray-900">
              {formData.genderBreakdown.males > 0 && `${formData.genderBreakdown.males} male${formData.genderBreakdown.males > 1 ? 's' : ''}`}
              {formData.genderBreakdown.females > 0 && `, ${formData.genderBreakdown.females} female${formData.genderBreakdown.females > 1 ? 's' : ''}`}
              {formData.genderBreakdown.diverse > 0 && `, ${formData.genderBreakdown.diverse} diverse`}
            </p>
          </div>
        )}

        <div>
          <p className="text-sm text-gray-600 mb-2">Description</p>
          <p className="text-gray-900 whitespace-pre-line">{formData.description}</p>
        </div>

        {formData.images.length > 0 && (
          <div>
            <p className="text-sm text-gray-600 mb-2">Photos ({formData.images.length})</p>
            <div className="grid grid-cols-4 gap-2">
              {formData.images.map((image, index) => (
                <img
                  key={index}
                  src={image}
                  alt={`Preview ${index + 1}`}
                  className="w-full aspect-square object-cover rounded-lg"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
