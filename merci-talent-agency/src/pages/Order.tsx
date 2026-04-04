import { useState } from 'react';
import { motion } from 'motion/react';
import { Send, Check, Upload, X } from 'lucide-react';

export default function Order() {
  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    email: '',
    deadline: '',
    projectName: '',
    locationPostalCode: '',
    locationPrefecture: '',
    locationCity: '',
    locationAddressDetail: '',
    rehearsal: 'no',
    rehearsalDate: '',
    rehearsalStartTime: '',
    rehearsalEndTime: '',
    rehearsalLocation: '',
    mainEventDate: '',
    mainEventStartTime: '',
    mainEventEndTime: '',
    hiringCount: '',
    jobDescription: '',
    conditions: [] as string[],
    costumeProvided: 'no',
    selectionMethod: 'document',
    hourlyDailyRate: '',
    transportation: '',
    mealAllowance: '',
  });

  const [costumeImage, setCostumeImage] = useState<File | null>(null);
  const [costumeImageUrl, setCostumeImageUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookupAddress = async (zip: string, type: 'client' | 'location') => {
    const cleanZip = zip.replace(/-/g, '');
    if (cleanZip.length !== 7) return;
    
    try {
      const response = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleanZip}`);
      const data = await response.json();
      if (data.results) {
        const result = data.results[0];
        const prefecture = result.address1;
        const city = result.address2 + result.address3;
        
        if (type === 'location') {
          setFormData(prev => ({
            ...prev,
            locationPrefecture: prefecture,
            locationCity: city
          }));
        }
      }
    } catch (error) {
      console.error('Address lookup failed:', error);
    }
  };

  const conditionOptions = [
    '派手なネイルNG',
    '派手な髪色NG',
    '身長165cm以上',
    '英語対応可',
    '韓国語対応可',
    '中国語対応可',
  ];

  const handleConditionChange = (condition: string) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions.includes(condition)
        ? prev.conditions.filter(c => c !== condition)
        : [...prev.conditions, condition]
    }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCostumeImage(file);
      
      // Preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setCostumeImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      let uploadedImageUrl = '';
      if (costumeImage) {
        const uploadFormData = new FormData();
        uploadFormData.append('file', costumeImage);
        uploadFormData.append('folder', 'orders');

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: uploadFormData,
        });

        if (!uploadRes.ok) throw new Error('Failed to upload image');
        const uploadData = await uploadRes.json();
        uploadedImageUrl = uploadData.url;
      }

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'order',
          data: {
            ...formData,
            costumeImageUrl: uploadedImageUrl,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send order');
      }

      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Error submitting order:', err);
      setError(err.message || 'Something went wrong. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="pt-40 pb-32 container-custom min-h-screen">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto text-center space-y-8"
        >
          <div className="w-24 h-24 bg-brand-black text-brand-white rounded-full flex items-center justify-center mx-auto">
            <Check size={48} />
          </div>
          <h1 className="text-4xl font-serif tracking-widest uppercase">Order Received</h1>
          <p className="text-brand-gray leading-relaxed">
            オーダーを承りました。内容を確認の上、担当者より折り返しご連絡させていただきます。<br />
            送信ありがとうございました。
          </p>
          <button 
            onClick={() => window.location.href = '/'}
            className="btn-primary px-12 py-4 tracking-[0.3em] text-xs"
          >
            BACK TO HOME
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="pt-40 pb-32 container-custom">
      <div className="max-w-3xl mx-auto">
        <div className="mb-16 text-center">
          <h1 className="text-5xl md:text-6xl font-serif tracking-widest mb-6 uppercase">Order Form</h1>
          <p className="text-brand-gray tracking-[0.3em] text-xs uppercase">案件のご依頼・オーダーフォーム</p>
          <div className="w-24 h-px bg-brand-black mx-auto opacity-20 mt-8" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-12 bg-white p-8 md:p-16 rounded-2xl shadow-sm border border-brand-black/5">
          {/* Client Info */}
          <div className="space-y-8">
            <h2 className="text-xl font-serif tracking-widest uppercase border-b border-brand-black/10 pb-4">Client Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] tracking-widest text-brand-gray uppercase block font-bold">会社名</label>
                <input 
                  type="text" 
                  required
                  className="w-full bg-transparent border-b border-brand-black/20 py-3 focus:outline-none focus:border-brand-black transition-colors" 
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] tracking-widest text-brand-gray uppercase block font-bold">担当者名</label>
                <input 
                  type="text" 
                  required
                  className="w-full bg-transparent border-b border-brand-black/20 py-3 focus:outline-none focus:border-brand-black transition-colors" 
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] tracking-widest text-brand-gray uppercase block font-bold">メールアドレス</label>
              <input 
                type="email" 
                required
                className="w-full bg-transparent border-b border-brand-black/20 py-3 focus:outline-none focus:border-brand-black transition-colors" 
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          {/* Basic Info */}
          <div className="space-y-8">
            <h2 className="text-xl font-serif tracking-widest uppercase border-b border-brand-black/10 pb-4">Basic Information</h2>
            
            <div className="space-y-2">
              <label className="text-[10px] tracking-widest text-brand-gray uppercase block font-bold">募集締切日</label>
              <input 
                type="text" 
                required
                placeholder="例: 2024年5月31日"
                className="w-full bg-transparent border-b border-brand-black/20 py-3 focus:outline-none focus:border-brand-black transition-colors" 
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] tracking-widest text-brand-gray uppercase block font-bold">案件名</label>
              <input 
                type="text" 
                required
                className="w-full bg-transparent border-b border-brand-black/20 py-3 focus:outline-none focus:border-brand-black transition-colors" 
                value={formData.projectName}
                onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] tracking-widest text-brand-gray uppercase block font-bold">場所（郵便番号）</label>
                <input 
                  type="text" 
                  required
                  placeholder="000-0000"
                  className="w-full bg-transparent border-b border-brand-black/20 py-3 focus:outline-none focus:border-brand-black transition-colors" 
                  value={formData.locationPostalCode}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({ ...formData, locationPostalCode: val });
                    lookupAddress(val, 'location');
                  }}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] tracking-widest text-brand-gray uppercase block font-bold">都道府県</label>
                <input 
                  type="text" 
                  required
                  className="w-full bg-transparent border-b border-brand-black/20 py-3 focus:outline-none focus:border-brand-black transition-colors" 
                  value={formData.locationPrefecture}
                  onChange={(e) => setFormData({ ...formData, locationPrefecture: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] tracking-widest text-brand-gray uppercase block font-bold">市区町村</label>
                <input 
                  type="text" 
                  required
                  className="w-full bg-transparent border-b border-brand-black/20 py-3 focus:outline-none focus:border-brand-black transition-colors" 
                  value={formData.locationCity}
                  onChange={(e) => setFormData({ ...formData, locationCity: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] tracking-widest text-brand-gray uppercase block font-bold">それ以降の住所</label>
              <input 
                type="text" 
                required
                className="w-full bg-transparent border-b border-brand-black/20 py-3 focus:outline-none focus:border-brand-black transition-colors" 
                value={formData.locationAddressDetail}
                onChange={(e) => setFormData({ ...formData, locationAddressDetail: e.target.value })}
              />
            </div>
          </div>

          {/* Schedule */}
          <div className="space-y-8">
            <h2 className="text-xl font-serif tracking-widest uppercase border-b border-brand-black/10 pb-4">Schedule</h2>
            
            <div className="space-y-4">
              <label className="text-[10px] tracking-widest text-brand-gray uppercase block font-bold">リハーサル有無</label>
              <div className="flex space-x-8">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="rehearsal" 
                    value="yes"
                    checked={formData.rehearsal === 'yes'}
                    onChange={(e) => setFormData({ ...formData, rehearsal: e.target.value })}
                    className="w-4 h-4 accent-brand-black"
                  />
                  <span className="text-sm">有</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="rehearsal" 
                    value="no"
                    checked={formData.rehearsal === 'no'}
                    onChange={(e) => setFormData({ ...formData, rehearsal: e.target.value })}
                    className="w-4 h-4 accent-brand-black"
                  />
                  <span className="text-sm">無</span>
                </label>
              </div>
            </div>

            {formData.rehearsal === 'yes' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-8 pt-4"
              >
                <div className="space-y-6">
                  <label className="text-[10px] tracking-widest text-brand-gray uppercase block font-bold">リハーサル日時</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] tracking-widest text-brand-gray uppercase block">日付</label>
                      <input 
                        type="date" 
                        required={formData.rehearsal === 'yes'}
                        className="w-full bg-transparent border-b border-brand-black/20 py-3 focus:outline-none focus:border-brand-black transition-colors" 
                        value={formData.rehearsalDate}
                        onChange={(e) => setFormData({ ...formData, rehearsalDate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] tracking-widest text-brand-gray uppercase block">開始時刻</label>
                      <input 
                        type="time" 
                        required={formData.rehearsal === 'yes'}
                        className="w-full bg-transparent border-b border-brand-black/20 py-3 focus:outline-none focus:border-brand-black transition-colors" 
                        value={formData.rehearsalStartTime}
                        onChange={(e) => setFormData({ ...formData, rehearsalStartTime: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] tracking-widest text-brand-gray uppercase block">終了時刻</label>
                      <input 
                        type="time" 
                        required={formData.rehearsal === 'yes'}
                        className="w-full bg-transparent border-b border-brand-black/20 py-3 focus:outline-none focus:border-brand-black transition-colors" 
                        value={formData.rehearsalEndTime}
                        onChange={(e) => setFormData({ ...formData, rehearsalEndTime: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] tracking-widest text-brand-gray uppercase block font-bold">リハーサル場所</label>
                  <input 
                    type="text" 
                    required={formData.rehearsal === 'yes'}
                    className="w-full bg-transparent border-b border-brand-black/20 py-3 focus:outline-none focus:border-brand-black transition-colors" 
                    value={formData.rehearsalLocation}
                    onChange={(e) => setFormData({ ...formData, rehearsalLocation: e.target.value })}
                  />
                </div>
              </motion.div>
            )}

            <div className="space-y-6">
              <label className="text-[10px] tracking-widest text-brand-gray uppercase block font-bold">本番日時</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] tracking-widest text-brand-gray uppercase block">日付</label>
                  <input 
                    type="date" 
                    required
                    className="w-full bg-transparent border-b border-brand-black/20 py-3 focus:outline-none focus:border-brand-black transition-colors" 
                    value={formData.mainEventDate}
                    onChange={(e) => setFormData({ ...formData, mainEventDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] tracking-widest text-brand-gray uppercase block">開始時刻</label>
                  <input 
                    type="time" 
                    required
                    className="w-full bg-transparent border-b border-brand-black/20 py-3 focus:outline-none focus:border-brand-black transition-colors" 
                    value={formData.mainEventStartTime}
                    onChange={(e) => setFormData({ ...formData, mainEventStartTime: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] tracking-widest text-brand-gray uppercase block">終了時刻</label>
                  <input 
                    type="time" 
                    required
                    className="w-full bg-transparent border-b border-brand-black/20 py-3 focus:outline-none focus:border-brand-black transition-colors" 
                    value={formData.mainEventEndTime}
                    onChange={(e) => setFormData({ ...formData, mainEventEndTime: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-8">
            <h2 className="text-xl font-serif tracking-widest uppercase border-b border-brand-black/10 pb-4">Job Details</h2>
            
            <div className="space-y-2">
              <label className="text-[10px] tracking-widest text-brand-gray uppercase block font-bold">採用人数</label>
              <input 
                type="text" 
                required
                className="w-full bg-transparent border-b border-brand-black/20 py-3 focus:outline-none focus:border-brand-black transition-colors" 
                value={formData.hiringCount}
                onChange={(e) => setFormData({ ...formData, hiringCount: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] tracking-widest text-brand-gray uppercase block font-bold">業務内容</label>
              <textarea 
                required
                rows={5}
                className="w-full bg-transparent border border-brand-black/20 p-4 focus:outline-none focus:border-brand-black transition-colors text-sm" 
                value={formData.jobDescription}
                onChange={(e) => setFormData({ ...formData, jobDescription: e.target.value })}
              />
            </div>

            <div className="space-y-4">
              <label className="text-[10px] tracking-widest text-brand-gray uppercase block font-bold">条件（あれば）</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {conditionOptions.map(option => (
                  <label key={option} className="flex items-center space-x-3 cursor-pointer group">
                    <div 
                      className={`w-5 h-5 border flex items-center justify-center transition-colors ${formData.conditions.includes(option) ? 'bg-brand-black border-brand-black' : 'border-brand-black/20 group-hover:border-brand-black'}`}
                      onClick={() => handleConditionChange(option)}
                    >
                      {formData.conditions.includes(option) && <Check size={14} className="text-white" />}
                    </div>
                    <span className="text-sm">{option}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Attire & Selection */}
          <div className="space-y-8">
            <h2 className="text-xl font-serif tracking-widest uppercase border-b border-brand-black/10 pb-4">Attire & Selection</h2>
            
            <div className="space-y-6">
              <label className="text-[10px] tracking-widest text-brand-gray uppercase block font-bold">衣装支給の有無</label>
              <div className="flex space-x-8">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="costumeProvided" 
                    value="yes"
                    checked={formData.costumeProvided === 'yes'}
                    onChange={(e) => setFormData({ ...formData, costumeProvided: e.target.value })}
                    className="w-4 h-4 accent-brand-black"
                  />
                  <span className="text-sm">有</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="costumeProvided" 
                    value="no"
                    checked={formData.costumeProvided === 'no'}
                    onChange={(e) => setFormData({ ...formData, costumeProvided: e.target.value })}
                    className="w-4 h-4 accent-brand-black"
                  />
                  <span className="text-sm">無</span>
                </label>
              </div>

              {formData.costumeProvided === 'yes' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 pt-2"
                >
                  <label className="text-[10px] tracking-widest text-brand-gray uppercase block">衣装画像添付</label>
                  <div className="flex items-center space-x-4">
                    <label className="cursor-pointer flex items-center space-x-2 px-4 py-2 bg-brand-black/5 hover:bg-brand-black/10 transition-colors rounded-lg text-xs tracking-widest uppercase">
                      <Upload size={14} />
                      <span>Upload Image</span>
                      <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                    </label>
                    {costumeImage && <span className="text-xs text-brand-gray">{costumeImage.name}</span>}
                  </div>
                  {costumeImageUrl && (
                    <div className="relative w-32 aspect-[3/4] rounded-lg overflow-hidden border border-brand-black/10">
                      <img src={costumeImageUrl} alt="Preview" className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={() => { setCostumeImage(null); setCostumeImageUrl(null); }}
                        className="absolute top-1 right-1 bg-brand-black/50 text-white p-1 rounded-full hover:bg-brand-black transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </div>

            <div className="space-y-4">
              <label className="text-[10px] tracking-widest text-brand-gray uppercase block font-bold">選考方法</label>
              <div className="space-y-3">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input 
                    type="radio" 
                    name="selectionMethod" 
                    value="document"
                    checked={formData.selectionMethod === 'document'}
                    onChange={(e) => setFormData({ ...formData, selectionMethod: e.target.value })}
                    className="w-4 h-4 accent-brand-black"
                  />
                  <span className="text-sm">書類選考</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input 
                    type="radio" 
                    name="selectionMethod" 
                    value="audition"
                    checked={formData.selectionMethod === 'audition'}
                    onChange={(e) => setFormData({ ...formData, selectionMethod: e.target.value })}
                    className="w-4 h-4 accent-brand-black"
                  />
                  <span className="text-sm">書類選考通過後のオーディション</span>
                </label>
              </div>
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-8">
            <h2 className="text-xl font-serif tracking-widest uppercase border-b border-brand-black/10 pb-4">Payment</h2>
            
            <div className="space-y-2">
              <label className="text-[10px] tracking-widest text-brand-gray uppercase block font-bold">時給または日給</label>
              <input 
                type="text" 
                required
                className="w-full bg-transparent border-b border-brand-black/20 py-3 focus:outline-none focus:border-brand-black transition-colors" 
                value={formData.hourlyDailyRate}
                onChange={(e) => setFormData({ ...formData, hourlyDailyRate: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] tracking-widest text-brand-gray uppercase block font-bold">交通費</label>
                <input 
                  type="text" 
                  className="w-full bg-transparent border-b border-brand-black/20 py-3 focus:outline-none focus:border-brand-black transition-colors" 
                  value={formData.transportation}
                  onChange={(e) => setFormData({ ...formData, transportation: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] tracking-widest text-brand-gray uppercase block font-bold">食事代</label>
                <input 
                  type="text" 
                  className="w-full bg-transparent border-b border-brand-black/20 py-3 focus:outline-none focus:border-brand-black transition-colors" 
                  value={formData.mealAllowance}
                  onChange={(e) => setFormData({ ...formData, mealAllowance: e.target.value })}
                />
              </div>
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-[10px] tracking-widest uppercase text-center">{error}</p>
          )}

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="btn-primary w-full tracking-[0.4em] text-xs py-5 flex items-center justify-center shadow-lg hover:shadow-xl transition-all"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Send size={16} className="mr-3" />
                SEND ORDER REQUEST
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
