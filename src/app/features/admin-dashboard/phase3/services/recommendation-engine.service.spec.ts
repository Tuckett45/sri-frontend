import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RecommendationEngineService } from './recommendation-engine.service';
import { 
  Recommendation, 
  RecommendationContext,
  AcceptanceResult,
  Feedback
} from '../models/recommendation.models';
import { environment } from '../../../../../environments/environments';

describe('RecommendationEngineService', () => {
  let service: RecommendationEngineService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/ai/recommendations`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [RecommendationEngineService]
    });

    service = TestBed.inject(RecommendationEngineService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getRecommendations', () => {
    it('should fetch and sort recommendations by priority and confidence', (done) => {
      const context: RecommendationContext = {
        type: 'scheduling',
        entityId: 'job-123'
      };

      const mockRecommendations: Recommendation[] = [
        {
          id: '1',
          type: 'scheduling',
          title: 'Low Priority',
          description: 'Test',
          confidence: 0.9,
          priority: 'low',
          rationale: 'Test',
          supportingData: {},
          actions: [],
          createdAt: new Date(),
          status: 'pending'
        },
        {
          id: '2',
          type: 'scheduling',
          title: 'Critical Priority',
          description: 'Test',
          confidence: 0.7,
          priority: 'critical',
          rationale: 'Test',
          supportingData: {},
          actions: [],
          createdAt: new Date(),
          status: 'pending'
        },
        {
          id: '3',
          type: 'scheduling',
          title: 'High Priority',
          description: 'Test',
          confidence: 0.95,
          priority: 'high',
          rationale: 'Test',
          supportingData: {},
          actions: [],
          createdAt: new Date(),
          status: 'pending'
        }
      ];

      service.getRecommendations(context).subscribe(recommendations => {
        // Should be sorted: critical, high, low
        expect(recommendations.length).toBe(3);
        expect(recommendations[0].priority).toBe('critical');
        expect(recommendations[1].priority).toBe('high');
        expect(recommendations[2].priority).toBe('low');
        done();
      });

      const req = httpMock.expectOne((request) => 
        request.url === baseUrl && 
        request.params.get('type') === 'scheduling'
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockRecommendations);
    });

    it('should cache recommendations for 5 minutes', (done) => {
      const context: RecommendationContext = {
        type: 'scheduling'
      };

      const mockRecommendations: Recommendation[] = [{
        id: '1',
        type: 'scheduling',
        title: 'Test',
        description: 'Test',
        confidence: 0.9,
        priority: 'high',
        rationale: 'Test',
        supportingData: {},
        actions: [],
        createdAt: new Date(),
        status: 'pending'
      }];

      // First call - should hit the API
      service.getRecommendations(context).subscribe(recommendations => {
        expect(recommendations.length).toBe(1);

        // Second call - should use cache (no HTTP request)
        service.getRecommendations(context).subscribe(cachedRecommendations => {
          expect(cachedRecommendations.length).toBe(1);
          expect(cachedRecommendations[0].id).toBe('1');
          done();
        });
      });

      const req = httpMock.expectOne((request) => request.url === baseUrl);
      req.flush(mockRecommendations);
    });

    it('should sort recommendations with same priority by confidence descending', (done) => {
      const context: RecommendationContext = {
        type: 'scheduling'
      };

      const mockRecommendations: Recommendation[] = [
        {
          id: '1',
          type: 'scheduling',
          title: 'Lower Confidence',
          description: 'Test',
          confidence: 0.7,
          priority: 'high',
          rationale: 'Test',
          supportingData: {},
          actions: [],
          createdAt: new Date(),
          status: 'pending'
        },
        {
          id: '2',
          type: 'scheduling',
          title: 'Higher Confidence',
          description: 'Test',
          confidence: 0.95,
          priority: 'high',
          rationale: 'Test',
          supportingData: {},
          actions: [],
          createdAt: new Date(),
          status: 'pending'
        }
      ];

      service.getRecommendations(context).subscribe(recommendations => {
        expect(recommendations[0].confidence).toBe(0.95);
        expect(recommendations[1].confidence).toBe(0.7);
        done();
      });

      const req = httpMock.expectOne((request) => request.url === baseUrl);
      req.flush(mockRecommendations);
    });
  });

  describe('acceptRecommendation', () => {
    it('should accept a recommendation and clear cache', (done) => {
      const recommendationId = 'rec-123';
      const metadata = { reason: 'Looks good' };
      const mockResult: AcceptanceResult = {
        recommendationId,
        success: true,
        appliedActions: ['action-1'],
        results: {},
        timestamp: new Date()
      };

      service.acceptRecommendation(recommendationId, metadata).subscribe(result => {
        expect(result.success).toBe(true);
        expect(result.recommendationId).toBe(recommendationId);
        done();
      });

      const req = httpMock.expectOne(`${baseUrl}/${recommendationId}/accept`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ metadata });
      req.flush(mockResult);
    });
  });

  describe('rejectRecommendation', () => {
    it('should reject a recommendation with reason', (done) => {
      const recommendationId = 'rec-123';
      const reason = 'Not applicable';

      service.rejectRecommendation(recommendationId, reason).subscribe(() => {
        done();
      });

      const req = httpMock.expectOne(`${baseUrl}/${recommendationId}/reject`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ reason });
      req.flush(null);
    });
  });

  describe('provideFeedback', () => {
    it('should submit feedback for a recommendation', (done) => {
      const recommendationId = 'rec-123';
      const feedback: Feedback = {
        recommendationId,
        rating: 5,
        helpful: true,
        comment: 'Very useful',
        timestamp: new Date()
      };

      service.provideFeedback(recommendationId, feedback).subscribe(() => {
        done();
      });

      const req = httpMock.expectOne(`${baseUrl}/${recommendationId}/feedback`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(feedback);
      req.flush(null);
    });
  });

  describe('explainRecommendation', () => {
    it('should fetch explanation for a recommendation', (done) => {
      const recommendationId = 'rec-123';
      const mockExplanation = {
        recommendationId,
        factors: [
          {
            name: 'Historical Performance',
            weight: 0.7,
            value: 'High',
            impact: 'positive' as const
          }
        ],
        methodology: 'Machine Learning',
        dataSource: 'Historical Data',
        confidence: 0.9
      };

      service.explainRecommendation(recommendationId).subscribe(explanation => {
        expect(explanation.recommendationId).toBe(recommendationId);
        expect(explanation.factors.length).toBe(1);
        expect(explanation.confidence).toBe(0.9);
        done();
      });

      const req = httpMock.expectOne(`${baseUrl}/${recommendationId}/explain`);
      expect(req.request.method).toBe('GET');
      req.flush(mockExplanation);
    });
  });

  describe('getRecommendationMetrics', () => {
    it('should fetch recommendation analytics metrics', (done) => {
      const mockMetrics = {
        totalRecommendations: 100,
        acceptedRecommendations: 75,
        rejectedRecommendations: 20,
        acceptanceRate: 0.75,
        averageConfidence: 0.85,
        averageRating: 4.2,
        impactMetrics: {
          efficiency: 0.15,
          cost: -0.10
        }
      };

      service.getRecommendationMetrics().subscribe(metrics => {
        expect(metrics.totalRecommendations).toBe(100);
        expect(metrics.acceptanceRate).toBe(0.75);
        expect(metrics.averageConfidence).toBe(0.85);
        done();
      });

      const req = httpMock.expectOne(`${baseUrl}/metrics`);
      expect(req.request.method).toBe('GET');
      req.flush(mockMetrics);
    });
  });

  describe('refreshRecommendations', () => {
    it('should clear cache and fetch fresh recommendations', (done) => {
      const context: RecommendationContext = {
        type: 'scheduling'
      };

      const mockRecommendations: Recommendation[] = [{
        id: '1',
        type: 'scheduling',
        title: 'Test',
        description: 'Test',
        confidence: 0.9,
        priority: 'high',
        rationale: 'Test',
        supportingData: {},
        actions: [],
        createdAt: new Date(),
        status: 'pending'
      }];

      // First call to populate cache
      service.getRecommendations(context).subscribe(() => {
        // Refresh should bypass cache
        service.refreshRecommendations(context).subscribe(recommendations => {
          expect(recommendations.length).toBe(1);
          done();
        });

        const refreshReq = httpMock.expectOne((request) => request.url === baseUrl);
        refreshReq.flush(mockRecommendations);
      });

      const initialReq = httpMock.expectOne((request) => request.url === baseUrl);
      initialReq.flush(mockRecommendations);
    });
  });
});
