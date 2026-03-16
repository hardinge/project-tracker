import { Router } from 'express';
const router = Router();

router.get('/check', (req, res) => {
  res.json({ authenticated: !!req.session.authenticated });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (
    username === process.env.APP_USERNAME &&
    password === process.env.APP_PASSWORD
  ) {
    req.session.authenticated = true;
    req.session.save(err => {
      if (err) return res.status(500).json({ error: 'Session error' });
      res.json({ ok: true });
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

export default router;
