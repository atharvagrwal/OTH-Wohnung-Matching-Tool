import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useOffers, StayType, ApartmentType, PermissionStatus, GenderBreakdown, PriceBreakdown, OfferSpecifics } from '../context/OffersContext';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, ArrowRight, Check, Upload, X, Plus } from 'lucide-react';

export type HouseRuleValue = PermissionStatus;

//define house rules options
export const HOUSE_RULE_OPTIONS: { value: HouseRuleValue; label: string; activeColor: string }[] = [
    { value: 'not-allowed', label: 'Not allowed', activeColor: 'bg-red-50 text-red-700 border-red-300 font-semibold shadow-sm' },
    { value: 'maybe', label: 'To be discussed', activeColor: 'bg-amber-50 text-amber-800 border-amber-300 font-semibold shadow-sm' },
    { value: 'allowed', label: 'Allowed', activeColor: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold shadow-sm' },
];

//predefine the optional specifics for the offer
export type OptionalOfferSpecifics = {
    pets?: HouseRuleValue;
    smoking?: HouseRuleValue;
    parties?: HouseRuleValue;
    instruments?: HouseRuleValue;
    visitors?: HouseRuleValue;
};

//define the custom house rule interface
export interface CustomHouseRule {
    id: string;
    label: string;
    value?: HouseRuleValue;
}

interface OfferFormData {
    stayType: StayType | null;
    apartmentType: ApartmentType | null;
    name: string;
    address: string;
    moveInDate: string;
    moveOutDate: string;
    area: string;
    priceBreakdown: PriceBreakdown;
    genderBreakdown: GenderBreakdown;
    specifics: OptionalOfferSpecifics;
    customHouseRules: CustomHouseRule[];
    description: string;
    images: File[];
}

export function CreateOfferPage() {
    const navigate = useNavigate();
    const { addOffer } = useOffers();
    const { user } = useAuth();
    const [currentStep, setCurrentStep] = useState(1);
    const [agreedWithLandlord, setAgreedWithLandlord] = useState(false);

    const [formData, setFormData] = useState<OfferFormData>({
        stayType: null,
        apartmentType: null,
        name: '',
        address: '',
        moveInDate: '',
        moveOutDate: '',
        area: '',
        priceBreakdown: { kaltmiete: 0, nebenkosten: 0, kaution: 0, ablose: 0, sonstiges: 0 },
        genderBreakdown: { males: 0, females: 0, diverse: 0 },
        specifics: {
            pets: undefined,
            smoking: undefined,
            parties: undefined,
            instruments: undefined,
            visitors: undefined,
        },
        customHouseRules: [],
        description: '',
        images: [],
    });

    const totalSteps = 10;

    const canProceed = () => {
        switch (currentStep) {
            case 1: return formData.stayType !== null;
            case 2: return formData.apartmentType !== null;
            case 3: return formData.name.trim() !== '';
            case 4:
                if (formData.stayType === 'zwischenmiete') {
                    return formData.address.trim() !== '' && formData.moveInDate !== '' && formData.moveOutDate !== '';
                }
                return formData.address.trim() !== '' && formData.moveInDate !== '';
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
            if (currentStep === 5 && (formData.apartmentType === 'studio' || formData.apartmentType === 'apartment')) {
                setCurrentStep(7);
            } else {
                setCurrentStep(prev => prev + 1);
            }
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            if (currentStep === 7 && (formData.apartmentType === 'studio' || formData.apartmentType === 'apartment')) {
                setCurrentStep(5);
            } else {
                setCurrentStep(prev => prev - 1);
            }
        }
    };

    const handleSubmit = async () => {
        if (!formData.stayType || !formData.apartmentType) return;
        if (formData.stayType === 'zwischenmiete' && !agreedWithLandlord) return;

        const totalPrice = formData.priceBreakdown.kaltmiete + formData.priceBreakdown.nebenkosten;

        const isSharedWG = formData.apartmentType === 'WG';
        const finalGenderBreakdown = isSharedWG ? formData.genderBreakdown : { males: 0, females: 0, diverse: 0 };

        try {
            const { images, customHouseRules, ...textMetadata } = formData;

            //add custom house rules to the description (only frontend)
            let finalDescription = textMetadata.description;
            if (customHouseRules.length > 0) {
                const customRulesSummary = customHouseRules
                    .map(r => `• ${r.label}: ${r.value ? HOUSE_RULE_OPTIONS.find(o => o.value === r.value)?.label : 'To be discussed'}`)
                    .join('\n');
                finalDescription = `${finalDescription}\n\nAdditional House Rules:\n${customRulesSummary}`;
            }

            await addOffer({
                name: textMetadata.name,
                address: textMetadata.address,
                stayType: textMetadata.stayType || 'nachmieter',
                apartmentType: textMetadata.apartmentType || 'apartment',
                moveInDate: textMetadata.moveInDate,
                moveOutDate: textMetadata.stayType === 'zwischenmiete' ? textMetadata.moveOutDate : undefined,
                area: Number(textMetadata.area) || 0,
                description: finalDescription,
                genderBreakdown: finalGenderBreakdown,
                priceBreakdown: textMetadata.priceBreakdown,
                totalPrice,
                specifics: textMetadata.specifics as OfferSpecifics,
                contactEmail: user?.email || 'dummy@oth-regensburg.de',
                createdBy: user?.id || '1',
            }, images);

            navigate('/');
        } catch (error) {
            console.error("Failed to post offer over multipart stream boundary:", error);
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
                        moveOutDate={formData.moveOutDate}
                        stayType={formData.stayType}
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
                        customRules={formData.customHouseRules}
                        onChange={(specifics) => setFormData(prev => ({ ...prev, specifics }))}
                        onCustomRulesChange={(customHouseRules) => setFormData(prev => ({ ...prev, customHouseRules }))}
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
                        files={formData.images}
                        onChange={(images) => setFormData(prev => ({ ...prev, images }))}
                    />
                );
            case 10:
                return (
                    <StepReview
                        formData={formData}
                        agreed={agreedWithLandlord}
                        onAgreeChange={setAgreedWithLandlord}
                    />
                );
            default:
                return null;
        }
    };

    const displayStepLabel = (currentStep === 6 && (formData.apartmentType === 'studio' || formData.apartmentType === 'apartment'))
        ? 'Step 5 of 9'
        : (formData.apartmentType === 'studio' || formData.apartmentType === 'apartment') && currentStep > 5
            ? `Step ${currentStep - 1} of 9`
            : `Step ${currentStep} of 10`;

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Offer</h1>
                <p className="text-gray-600">{displayStepLabel}</p>
            </div>

            <div className="mb-8">
                <div className="flex items-center gap-2">
                    {Array.from({ length: totalSteps }).map((_, index) => {
                        const stepNum = index + 1;
                        if (stepNum === 6 && (formData.apartmentType === 'studio' || formData.apartmentType === 'apartment')) {
                            return null;
                        }
                        return (
                            <div
                                key={index}
                                className={`h-2 flex-1 rounded-full transition-colors ${
                                    stepNum <= currentStep ? 'bg-blue-600' : 'bg-gray-200'
                                }`}
                            />
                        );
                    })}
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
                        disabled={formData.stayType === 'zwischenmiete' && !agreedWithLandlord}
                        className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
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
                          moveOutDate,
                          stayType,
                          area,
                          onChange,
                      }: {
    address: string;
    moveInDate: string;
    moveOutDate: string;
    stayType: StayType | null;
    area: string;
    onChange: (field: string, value: string) => void;
}) {
    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Location & Availability details</h2>
            <p className="text-gray-600 mb-6">Where and when is your accommodation located?</p>

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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Available From *
                        </label>
                        <input
                            type="date"
                            value={moveInDate}
                            onChange={(e) => onChange('moveInDate', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                    </div>

                    {stayType === 'zwischenmiete' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Available Until *
                            </label>
                            <input
                                type="date"
                                value={moveOutDate}
                                min={moveInDate}
                                onChange={(e) => onChange('moveOutDate', e.target.value)}
                                className="w-full px-4 py-3 border border-amber-300 bg-amber-50/30 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                            />
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Area (m²) - Optional
                    </label>
                    <input
                        type="number"
                        value={area === '0' || area === '' ? '' : area}
                        onChange={(e) => onChange('area', e.target.value)}
                        placeholder="0"
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
        onChange({ ...priceBreakdown, [field]: value === '' ? 0 : Number(value) });
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
                            value={priceBreakdown.kaltmiete || ''}
                            onChange={(e) => updateField('kaltmiete', e.target.value)}
                            placeholder="0"
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
                            value={priceBreakdown.nebenkosten || ''}
                            onChange={(e) => updateField('nebenkosten', e.target.value)}
                            placeholder="0"
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
                            value={priceBreakdown.kaution || ''}
                            onChange={(e) => updateField('kaution', e.target.value)}
                            placeholder="0"
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
                            value={priceBreakdown.ablose || ''}
                            onChange={(e) => updateField('ablose', e.target.value)}
                            placeholder="0"
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
                            value={priceBreakdown.sonstiges || ''}
                            onChange={(e) => updateField('sonstiges', e.target.value)}
                            placeholder="0"
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
        onChange({ ...genderBreakdown, [field]: value === '' ? 0 : Number(value) });
    };

    const total = genderBreakdown.males + genderBreakdown.females + genderBreakdown.diverse;

    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Gender breakdown in WG</h2>
            <p className="text-gray-600 mb-6">How many people of each gender live in the apartment?</p>

            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Males
                        </label>
                        <input
                            type="number"
                            value={genderBreakdown.males || ''}
                            onChange={(e) => updateField('males', e.target.value)}
                            placeholder="0"
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
                            value={genderBreakdown.females || ''}
                            onChange={(e) => updateField('females', e.target.value)}
                            placeholder="0"
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
                            value={genderBreakdown.diverse || ''}
                            onChange={(e) => updateField('diverse', e.target.value)}
                            placeholder="0"
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

//house rules
function StepSpecifics({
                           specifics,
                           customRules,
                           onChange,
                           onCustomRulesChange,
                       }: {
    specifics: OptionalOfferSpecifics;
    customRules: CustomHouseRule[];
    onChange: (value: OptionalOfferSpecifics) => void;
    onCustomRulesChange: (rules: CustomHouseRule[]) => void;
}) {
    //custom rule input state
    const [newRuleInput, setNewRuleInput] = useState('');

    const toggleField = (field: keyof OptionalOfferSpecifics, clickedValue: HouseRuleValue) => {
        const nextValue = specifics[field] === clickedValue ? undefined : clickedValue;
        onChange({ ...specifics, [field]: nextValue });
    };

    const handleAddCustomRule = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = newRuleInput.trim();
        if (!trimmed) return;

        const newRule: CustomHouseRule = {
            id: Date.now().toString(),
            label: trimmed,
            value: undefined,
        };

        onCustomRulesChange([...customRules, newRule]);
        setNewRuleInput('');
    };

    const toggleCustomRuleValue = (id: string, clickedValue: HouseRuleValue) => {
        onCustomRulesChange(
            customRules.map(rule => {
                if (rule.id === id) {
                    return {
                        ...rule,
                        value: rule.value === clickedValue ? undefined : clickedValue,
                    };
                }
                return rule;
            })
        );
    };

    //delete custom rule
    const handleDeleteCustomRule = (id: string) => {
        onCustomRulesChange(customRules.filter(rule => rule.id !== id));
    };

    //predefined categories for house rules
    const categories: { field: keyof OptionalOfferSpecifics; label: string }[] = [
        { field: 'pets', label: 'Pets' },
        { field: 'smoking', label: 'Smoking' },
        { field: 'parties', label: 'Parties' },
        { field: 'instruments', label: 'Musical Instruments' },
        { field: 'visitors', label: 'Overnight Visitors' },
    ];

    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">House rules</h2>
            <p className="text-gray-600 mb-6">
                Set rules for your accommodation or add your own custom preferences. Click any option again to deselect it. Optional step
            </p>

            <div className="space-y-6">
                {categories.map((category) => {
                    const currentValue = specifics[category.field];
                    return (
                        <div key={category.field} className="pb-4 border-b border-gray-100 last:border-b-0">
                            <div className="mb-3">
                                <label className="block text-sm font-medium text-gray-700">
                                    {category.label}
                                </label>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                {HOUSE_RULE_OPTIONS.map((option) => {
                                    const isSelected = currentValue === option.value;
                                    return (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => toggleField(category.field, option.value)}
                                            className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                                                isSelected
                                                    ? option.activeColor
                                                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50/60'
                                            }`}
                                        >
                                            {option.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}

                {customRules.map((rule) => (
                    <div key={rule.id} className="pb-4 border-b border-gray-100">
                        <div className="flex items-center justify-between mb-3">
                            <label className="block text-sm font-medium text-gray-800">
                                {rule.label}
                            </label>
                            <button
                                type="button"
                                onClick={() => handleDeleteCustomRule(rule.id)}
                                className="text-gray-400 hover:text-red-600 transition-colors p-1"
                                title="Remove rule"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            {HOUSE_RULE_OPTIONS.map((option) => {
                                const isSelected = rule.value === option.value;
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => toggleCustomRuleValue(rule.id, option.value)}
                                        className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                                            isSelected
                                                ? option.activeColor
                                                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50/60'
                                        }`}
                                    >
                                        {option.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}

                <div className="pt-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Add a custom rule
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newRuleInput}
                            onChange={(e) => setNewRuleInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddCustomRule(e);
                                }
                            }}
                            placeholder="e.g., Quiet hours after 10 PM, Shoes off inside..."
                            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                        <button
                            type="button"
                            onClick={handleAddCustomRule}
                            disabled={!newRuleInput.trim()}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Plus size={16} />
                            Add Rule
                        </button>
                    </div>
                </div>
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
                placeholder="Tell potential tenants about the room, amenities, location..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                autoFocus
            />
            <p className="text-sm text-gray-500 mt-2">{value.length} characters</p>
        </div>
    );
}

function StepPhotos({ files, onChange }: { files: File[]; onChange: (value: File[]) => void }) {
    const [previews, setPreviews] = useState<string[]>([]);

    useEffect(() => {
        const objectUrls = files.map(file => URL.createObjectURL(file));
        setPreviews(objectUrls);
        return () => objectUrls.forEach(url => URL.revokeObjectURL(url));
    }, [files]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files);
            onChange([...files, ...selectedFiles]);
        }
    };

    const removeImage = (index: number) => {
        onChange(files.filter((_, i) => i !== index));
    };

    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Add photos</h2>
            <p className="text-gray-600 mb-6">Upload images to showcase your accommodation</p>

            <div className="space-y-4">
                <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-10 h-10 text-gray-400 mb-3" />
                            <p className="mb-2 text-sm text-gray-500 font-semibold">Click to upload accommodation files</p>
                            <p className="text-xs text-gray-400">PNG, JPG, or JPEG metadata</p>
                        </div>
                        <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                    </label>
                </div>

                {previews.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {previews.map((url, index) => (
                            <div key={index} className="relative group">
                                <img
                                    src={url}
                                    alt={`Upload Preview ${index + 1}`}
                                    className="w-full aspect-square object-cover rounded-lg shadow-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => removeImage(index)}
                                    className="absolute top-2 right-2 w-8 h-8 bg-red-600 text-white rounded-full opacity-100 flex items-center justify-center shadow-md hover:bg-red-700"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                <p className="text-sm text-gray-500">{files.length} stacked files</p>
            </div>
        </div>
    );
}

function StepReview({
                        formData,
                        agreed,
                        onAgreeChange
                    }: {
    formData: OfferFormData;
    agreed: boolean;
    onAgreeChange: (value: boolean) => void;
}) {
    const totalPrice = formData.priceBreakdown.kaltmiete + formData.priceBreakdown.nebenkosten;
    const totalTenants = formData.genderBreakdown.males + formData.genderBreakdown.females + formData.genderBreakdown.diverse;
    const [reviewPreviews, setReviewPreviews] = useState<string[]>([]);

    useEffect(() => {
        const objectUrls = formData.images.map(file => URL.createObjectURL(file));
        setReviewPreviews(objectUrls);
        return () => objectUrls.forEach(url => URL.revokeObjectURL(url));
    }, [formData.images]);

    const getStayTypeLabel = (type: StayType | null) => {
        if (!type) return '';
        const labels = { zwischenmiete: 'Zwischenmiete', nachmieter: 'Nachmieter', couchsurfing: 'Couchsurfing' };
        return labels[type];
    };

    const getHouseRuleLabel = (val?: HouseRuleValue) => {
        if (!val) return 'Not specified';
        const match = HOUSE_RULE_OPTIONS.find(o => o.value === val);
        return match ? match.label : 'Not specified';
    };

    const isSharedWG = formData.apartmentType === 'WG';

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
                            {formData.moveInDate ? new Date(formData.moveInDate).toLocaleDateString('de-DE') : ''}
                        </p>
                    </div>
                    {formData.stayType === 'zwischenmiete' && formData.moveOutDate && (
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Move-out Date (Until)</p>
                            <p className="font-medium text-gray-900">
                                {new Date(formData.moveOutDate).toLocaleDateString('de-DE')}
                            </p>
                        </div>
                    )}
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

                <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-3">House Rules & Specifics</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                        <div>
                            <span className="text-gray-500 block text-xs">Smoking</span>
                            <span className="font-medium text-gray-800">{getHouseRuleLabel(formData.specifics.smoking)}</span>
                        </div>
                        <div>
                            <span className="text-gray-500 block text-xs">Pets</span>
                            <span className="font-medium text-gray-800">{getHouseRuleLabel(formData.specifics.pets)}</span>
                        </div>
                        <div>
                            <span className="text-gray-500 block text-xs">Parties</span>
                            <span className="font-medium text-gray-800">{getHouseRuleLabel(formData.specifics.parties)}</span>
                        </div>
                        <div>
                            <span className="text-gray-500 block text-xs">Instruments</span>
                            <span className="font-medium text-gray-800">{getHouseRuleLabel(formData.specifics.instruments)}</span>
                        </div>
                        <div>
                            <span className="text-gray-500 block text-xs">Visitors</span>
                            <span className="font-medium text-gray-800">{getHouseRuleLabel(formData.specifics.visitors)}</span>
                        </div>
                        {formData.customHouseRules.map((cr) => (
                            <div key={cr.id}>
                                <span className="text-gray-500 block text-xs">{cr.label}</span>
                                <span className="font-medium text-gray-800">{getHouseRuleLabel(cr.value)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {isSharedWG && totalTenants > 0 && (
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

                {reviewPreviews.length > 0 && (
                    <div>
                        <p className="text-sm text-gray-600 mb-2">Photos ready for storage upload ({reviewPreviews.length})</p>
                        <div className="grid grid-cols-4 gap-2">
                            {reviewPreviews.map((url, index) => (
                                <img
                                    key={index}
                                    src={url}
                                    alt={`Preview ${index + 1}`}
                                    className="w-full aspect-square object-cover rounded-lg shadow-sm"
                                />
                            ))}
                        </div>
                    </div>
                )}

                {formData.stayType === 'zwischenmiete' && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                        <label className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={agreed}
                                onChange={(e) => onAgreeChange(e.target.checked)}
                                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-0.5"
                            />
                            <span className="text-sm text-amber-900 font-medium">
                                I hereby confirm that this stay has been agreed with by the landlord
                            </span>
                        </label>
                    </div>
                )}
            </div>
        </div>
    );
}