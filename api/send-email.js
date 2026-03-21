// Vercel Serverless Function — api/send-email.js
import nodemailer from 'nodemailer'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY  // Use service key server-side
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { alerts, unit, reportData } = req.body

  // Fetch recipients from DB
  const recipients = []
  try {
    const { data } = await supabase.from('unit_emails').select('email').eq('unit', unit)
    if (data) recipients.push(...data.map(r => r.email))

    // Fetch parent units (up to 2 levels)
    let currentUnit = unit
    for (let i = 0; i < 2; i++) {
      const { data: hierarchy } = await supabase.from('hierarchy').select('parent_unit').eq('child_unit', currentUnit).single()
      if (hierarchy?.parent_unit) {
        const { data: parentEmail } = await supabase.from('unit_emails').select('email').eq('unit', hierarchy.parent_unit).single()
        if (parentEmail?.email) recipients.push(parentEmail.email)
        currentUnit = hierarchy.parent_unit
      } else break
    }
  } catch (e) {
    console.error('DB error:', e)
  }

  if (recipients.length === 0) return res.status(200).json({ message: 'No recipients found' })

  // Send email
  try {
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_SERVER,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })

    const alertsHtml = alerts.map(a => `<li style="color:${a.includes('עירוב') || a.includes('כשרות') ? '#c62828' : '#e65100'}">${a}</li>`).join('')

    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: [...new Set(recipients)].join(', '),
      subject: `🚨 התראה קריטית — מערכת רבנות פיקוד מרכז — ${unit}`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
          <h2 style="color: #1a3a5c;">⚠️ התראה אוטומטית — מערכת רבנות</h2>
          <p>שלום רב,</p>
          <p>זוהי התראה אוטומטית ממערכת רבנות פיקוד מרכז עבור <strong>${unit}</strong>:</p>
          <ul>${alertsHtml}</ul>
          <hr style="border: 1px solid #eee;" />
          <p style="font-size:12px;color:#999;">מוצב: ${reportData.base} | מבקר: ${reportData.inspector} | תאריך: ${reportData.date}</p>
          <p style="font-size:12px;color:#1a3a5c;font-weight:bold;">מערכת בקרה רבנות פיקוד מרכז ✡️</p>
        </div>
      `,
    })

    res.status(200).json({ sent: true, recipients: recipients.length })
  } catch (e) {
    console.error('Email error:', e)
    res.status(500).json({ error: e.message })
  }
}
