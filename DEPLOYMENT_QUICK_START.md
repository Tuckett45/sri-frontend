# ATLAS Integration - Deployment Quick Start Guide

## 🚀 Quick Deployment Steps

### 1. Pre-Deployment Verification (5 minutes)

```bash
# Verify Node.js version
node --version  # Should be >= 20.0.0

# Verify npm version
npm --version   # Should be >= 10.0.0

# Install dependencies
npm install

# Build for production
npm run build --configuration=production
```

### 2. Environment Configuration (10 minutes)

Create or update environment files:

**`src/environments/environment.prod.ts`**:
```typescript
export const environment = {
  production: true,
  atlasApiUrl: 'https://api.atlas.production.com',
  atlasEnabled: true,
  atlasFeatures: {
    deployments: true,
    aiAnalysis: true,
    approvals: true,
    exceptions: true,
    agents: true,
    queryBuilder: true
  },
  signalRUrl: 'https://realtime.atlas.production.com',
  enableDebugTools: false
};
```

### 3. Feature Flags Configuration (5 minutes)

Configure feature flags for gradual rollout:

```typescript
// Initial deployment - 10% of users
atlasRolloutPercentage: 10

// After 24 hours - 50% of users
atlasRolloutPercentage: 50

// After 48 hours - 100% of users
atlasRolloutPercentage: 100
```

### 4. Deploy to Staging (15 minutes)

```bash
# Build staging bundle
npm run build --configuration=staging

# Deploy to staging server
# (Use your deployment tool/script)

# Run smoke tests
npm run test:e2e -- --env=staging
```

### 5. Staging Verification (10 minutes)

Test these critical flows:
- [ ] Login and authentication
- [ ] View deployment list
- [ ] Create new deployment
- [ ] View deployment details
- [ ] Transition deployment state
- [ ] Submit evidence
- [ ] Run AI analysis
- [ ] Request approval
- [ ] Create exception
- [ ] Execute agent
- [ ] Build and run query

### 6. Deploy to Production (10 minutes)

```bash
# Build production bundle
npm run build --configuration=production

# Deploy to production server
# (Use your deployment tool/script)

# Verify deployment
curl https://your-app.com/health
```

### 7. Post-Deployment Monitoring (First 24 hours)

Monitor these metrics:
- [ ] Error rate < 1%
- [ ] API response time < 500ms (p95)
- [ ] Authentication success rate > 99%
- [ ] Real-time updates working
- [ ] No critical errors in logs

---

## 🔧 Configuration Reference

### Required Environment Variables

```bash
ATLAS_API_URL=https://api.atlas.production.com
ATLAS_SIGNALR_URL=https://realtime.atlas.production.com
ATLAS_ENABLED=true
ATLAS_CLIENT_ID=your-client-id
```

### Optional Environment Variables

```bash
ATLAS_DEBUG_MODE=false
ATLAS_CACHE_TTL=300000
ATLAS_REQUEST_TIMEOUT=30000
ATLAS_MAX_RETRIES=3
ATLAS_CIRCUIT_BREAKER_THRESHOLD=5
```

---

## 🔍 Health Check Endpoints

After deployment, verify these endpoints:

```bash
# Application health
GET /health

# ATLAS integration status
GET /api/atlas/health

# Authentication status
GET /api/auth/status
```

---

## 🚨 Rollback Procedure

If issues occur:

### Option 1: Disable ATLAS Feature Flag (Fastest)

```typescript
// Update environment configuration
atlasEnabled: false
```

Application will automatically fall back to ARK services.

### Option 2: Full Rollback

```bash
# Revert to previous deployment
# (Use your deployment tool/script)

# Verify rollback
curl https://your-app.com/health
```

---

## 📊 Monitoring Dashboards

Access these dashboards post-deployment:

1. **Error Tracking**: [Your error tracking URL]
2. **Performance Monitoring**: [Your APM URL]
3. **User Analytics**: [Your analytics URL]
4. **ATLAS Health**: `/atlas/admin/health`

---

## 🐛 Common Issues & Solutions

### Issue: Authentication Fails

**Solution**:
1. Verify ATLAS_API_URL is correct
2. Check ATLAS_CLIENT_ID is configured
3. Verify SSL certificates are valid
4. Check ATLAS backend is accessible

### Issue: Real-Time Updates Not Working

**Solution**:
1. Verify ATLAS_SIGNALR_URL is correct
2. Check WebSocket connections are allowed
3. Verify SignalR server is running
4. Check firewall rules

### Issue: Slow Performance

**Solution**:
1. Verify caching is enabled
2. Check API response times
3. Review network latency
4. Check database performance

### Issue: Components Not Loading

**Solution**:
1. Clear browser cache
2. Verify lazy loading configuration
3. Check console for errors
4. Verify bundle was built correctly

---

## 📞 Support Contacts

- **Technical Issues**: [Your support email]
- **Security Concerns**: [Your security email]
- **Deployment Help**: [Your DevOps email]

---

## 📚 Additional Resources

- **Full Documentation**: `src/app/features/atlas/docs/`
- **Developer Guide**: `DEVELOPER_GUIDE.md`
- **API Documentation**: `API_CLIENT_GENERATION.md`
- **Troubleshooting**: `TROUBLESHOOTING.md`
- **Migration Guide**: `MIGRATION_GUIDE.md`

---

## ✅ Deployment Checklist

### Pre-Deployment
- [ ] Code reviewed and approved
- [ ] All tests passing
- [ ] Security scan completed
- [ ] Performance testing done
- [ ] Documentation updated
- [ ] Rollback plan prepared
- [ ] Monitoring configured
- [ ] Alerts set up

### During Deployment
- [ ] Staging deployment successful
- [ ] Staging tests passed
- [ ] Production deployment successful
- [ ] Health checks passing
- [ ] Feature flags configured
- [ ] Monitoring active

### Post-Deployment
- [ ] Error rates normal
- [ ] Performance metrics good
- [ ] User feedback collected
- [ ] No critical issues
- [ ] Documentation updated
- [ ] Team notified

---

## 🎯 Success Metrics

Track these KPIs:

| Metric | Target | Current |
|--------|--------|---------|
| Error Rate | < 1% | TBD |
| API Response Time (p95) | < 500ms | TBD |
| Authentication Success | > 99% | TBD |
| User Adoption | > 80% in 30 days | TBD |
| User Satisfaction | > 4/5 | TBD |

---

**Last Updated**: February 12, 2026  
**Version**: 1.0  
**Owner**: DevOps Team
