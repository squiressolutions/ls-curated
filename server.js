import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import nodemailer from 'nodemailer'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app  = express()
const PORT = process.env.PORT || 3005

const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL    || 'lakeesha@lscurateddesign.com'
const GMAIL_USER   = process.env.GMAIL_USER       || 'lakeesha@lscurateddesign.com'
const GMAIL_PASS   = process.env.GMAIL_APP_PASSWORD

function getTransporter() {
  return nodemailer.createTransport({ service: 'gmail', auth: { user: GMAIL_USER, pass: GMAIL_PASS } })
}

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, 'public')))

// ── Gallery API ───────────────────────────────────────────────────────────────
// Drop paired images into public/gallery/ named like:
//   living-room-before.jpg  /  living-room-after.jpg
//   bedroom-before.jpg      /  bedroom-after.jpg
// The API auto-pairs them by prefix.
app.get('/api/gallery', (req, res) => {
  const galleryDir = path.join(__dirname, 'public', 'gallery')
  try {
    const files   = fs.readdirSync(galleryDir).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
    const befores = files.filter(f => f.includes('-before.'))
    const pairs   = befores.map(b => {
      const prefix = b.replace(/-before\.[^.]+$/, '')
      const ext    = b.split('.').pop()
      const after  = files.find(f => f.startsWith(prefix + '-after.'))
      const label  = prefix.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      return after ? { label, before: `/gallery/${b}`, after: `/gallery/${after}` } : null
    }).filter(Boolean)
    res.json(pairs)
  } catch {
    res.json([])
  }
})

// ── Quote Request ─────────────────────────────────────────────────────────────
app.post('/api/quote', async (req, res) => {
  const { fname, lname, email, phone, service, timeline, budget, rooms, notes } = req.body
  const name = [fname, lname].filter(Boolean).join(' ').trim()

  if (!name || !email) return res.status(400).json({ error: 'Name and email are required.' })

  console.log(`[QUOTE] ${new Date().toISOString()} | ${name} | ${service} | ${email}`)

  const html = `
    <div style="font-family:sans-serif;max-width:640px;margin:0 auto;background:#f5f2ec;padding:32px;border-radius:10px;">
      <div style="background:linear-gradient(135deg,#3a5740,#0a0a0a);padding:24px;border-radius:8px;margin-bottom:20px;">
        <h1 style="color:#f4efe6;margin:0;font-size:20px;letter-spacing:2px;">NEW PROJECT INQUIRY</h1>
        <p style="color:rgba(244,239,230,0.5);margin:5px 0 0;font-size:13px;letter-spacing:1px;">LS Curated Design, LLC</p>
      </div>

      <div style="background:#fff;border-radius:8px;padding:20px;margin-bottom:14px;border-left:4px solid #3a5740;">
        <h2 style="font-size:11px;color:#3a5740;letter-spacing:2px;text-transform:uppercase;margin:0 0 14px;">Client Information</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:6px 0;color:#888;width:32%;">Name</td><td style="color:#0a0a0a;font-weight:600;">${name}</td></tr>
          <tr><td style="padding:6px 0;color:#888;">Email</td><td><a href="mailto:${email}" style="color:#3a5740;">${email}</a></td></tr>
          <tr><td style="padding:6px 0;color:#888;">Phone</td><td style="color:#0a0a0a;">${phone || 'Not provided'}</td></tr>
        </table>
      </div>

      <div style="background:#fff;border-radius:8px;padding:20px;margin-bottom:14px;border-left:4px solid #3a5740;">
        <h2 style="font-size:11px;color:#3a5740;letter-spacing:2px;text-transform:uppercase;margin:0 0 14px;">Project Details</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:6px 0;color:#888;width:32%;">Service</td><td style="color:#0a0a0a;font-weight:600;">${service || 'Not specified'}</td></tr>
          <tr><td style="padding:6px 0;color:#888;">Rooms / Spaces</td><td style="color:#0a0a0a;">${rooms || 'Not specified'}</td></tr>
          <tr><td style="padding:6px 0;color:#888;">Timeline</td><td style="color:#0a0a0a;">${timeline || 'Not specified'}</td></tr>
          <tr><td style="padding:6px 0;color:#888;">Budget Range</td><td style="color:#0a0a0a;font-weight:600;">${budget || 'Not specified'}</td></tr>
        </table>
      </div>

      ${notes ? `
      <div style="background:#fff;border-radius:8px;padding:20px;border-left:4px solid #3a5740;">
        <h2 style="font-size:11px;color:#3a5740;letter-spacing:2px;text-transform:uppercase;margin:0 0 10px;">Additional Notes</h2>
        <p style="font-size:14px;color:#333;line-height:1.7;margin:0;">${notes}</p>
      </div>` : ''}

      <div style="margin-top:16px;text-align:center;">
        <a href="mailto:${email}?subject=Re: Your LS Curated Design Inquiry&body=Hi ${fname},%0A%0AThank you for reaching out to LS Curated Design! I've received your project inquiry and will be in touch shortly to discuss your vision.%0A%0AWarm regards,%0ALakeesha%0ALS Curated Design, LLC"
          style="display:inline-block;background:#3a5740;color:#f4efe6;padding:10px 24px;border-radius:4px;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:1px;">
          REPLY TO ${fname ? fname.toUpperCase() : name.toUpperCase()}
        </a>
      </div>

      <div style="margin-top:16px;padding:12px;background:#0a0a0a;border-radius:6px;text-align:center;">
        <p style="color:rgba(255,255,255,0.3);font-size:11px;margin:0;letter-spacing:1px;">LS CURATED DESIGN, LLC &middot; ST. LOUIS, MO &middot; 314-492-4337</p>
      </div>
    </div>
  `

  if (!GMAIL_PASS) {
    console.warn('[QUOTE] No GMAIL_APP_PASSWORD — inquiry logged but email not sent.')
    return res.json({ success: true })
  }

  try {
    const t = getTransporter()
    await t.sendMail({
      from:    `"LS Curated Design" <${GMAIL_USER}>`,
      to:      NOTIFY_EMAIL,
      replyTo: email,
      subject: `New Project Inquiry: ${service || 'General'} — ${name}`,
      html
    })
    res.json({ success: true })
  } catch (err) {
    console.error('Email error:', err)
    res.json({ success: true })
  }
})

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')))

app.listen(PORT, () => console.log(`LS Curated Design running on port ${PORT}`))
