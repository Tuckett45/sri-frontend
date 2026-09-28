import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController, TestRequest } from '@angular/common/http/testing';

import { MaterialsService } from './materials.service';
import { environment } from '../../environments/environments';

/**
 * Contract smoke test for MaterialsService.
 *
 * PURPOSE: pin every frontend HTTP call to the exact backend route (URL path + verb)
 * exposed by sri-backend's MaterialsController. If someone renames a service method's
 * URL, changes a verb, or the backend route drifts, the matching case here fails —
 * so a frontend/backend contract mismatch can't reappear silently.
 *
 * This intentionally asserts ONLY the request line (method + URL, ignoring query string),
 * not response bodies or payload shapes. It is a routing guard, not a behavior test.
 *
 * The backend routes below are transcribed from:
 *   sri-backend/sri-backend/Controllers/MaterialsController.cs  ([Route("api/Materials")])
 */
describe('MaterialsService (frontend <-> backend contract)', () => {
  let service: MaterialsService;
  let httpMock: HttpTestingController;

  const base = `${environment.apiUrl}/Materials`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [MaterialsService]
    });
    service = TestBed.inject(MaterialsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  /**
   * Subscribe to the observable, then assert exactly one request was made whose
   * method and URL (path only, query string stripped) match the expected contract.
   */
  function expectContract(
    label: string,
    trigger: () => { subscribe: (...args: any[]) => unknown },
    method: string,
    expectedUrl: string
  ): void {
    trigger().subscribe();
    const matched = httpMock.match((req) => req.url === expectedUrl && req.method === method);
    expect(matched.length)
      .withContext(`${label}: expected exactly one ${method} ${expectedUrl}`)
      .toBe(1);
    matched.forEach((r: TestRequest) => r.flush(null));
  }

  it('is created', () => {
    expect(service).toBeTruthy();
  });

  // ---------------- Inventory ----------------
  it('getMaterials -> GET /Materials', () =>
    expectContract('getMaterials', () => service.getMaterials({ market: 'PHX' }), 'GET', base));

  it('getMaterial -> GET /Materials/{id}', () =>
    expectContract('getMaterial', () => service.getMaterial('m1'), 'GET', `${base}/m1`));

  it('saveMaterial (new) -> POST /Materials', () =>
    expectContract('saveMaterial(new)', () => service.saveMaterial({ name: 'Cable' } as any), 'POST', base));

  it('saveMaterial (existing) -> PUT /Materials/{id}', () =>
    expectContract('saveMaterial(existing)', () => service.saveMaterial({ id: 'm1', name: 'Cable' } as any), 'PUT', `${base}/m1`));

  it('deleteMaterial -> DELETE /Materials/{id}', () =>
    expectContract('deleteMaterial', () => service.deleteMaterial('m1'), 'DELETE', `${base}/m1`));

  it('importMaterials -> POST /Materials/import', () =>
    expectContract('importMaterials', () => service.importMaterials(new File(['x'], 'm.csv')), 'POST', `${base}/import`));

  it('importWorkbook -> POST /Materials/import/workbook', () =>
    expectContract('importWorkbook', () => service.importWorkbook({} as any), 'POST', `${base}/import/workbook`));

  // ---------------- Orders ----------------
  it('getOrders -> GET /Materials/orders', () =>
    expectContract('getOrders', () => service.getOrders(), 'GET', `${base}/orders`));

  it('getOrder -> GET /Materials/orders/{id}', () =>
    expectContract('getOrder', () => service.getOrder('o1'), 'GET', `${base}/orders/o1`));

  it('saveOrder -> POST /Materials/orders', () =>
    expectContract('saveOrder', () => service.saveOrder({} as any), 'POST', `${base}/orders`));

  it('fulfillOrder -> POST /Materials/orders/{id}/fulfill', () =>
    expectContract('fulfillOrder', () => service.fulfillOrder('o1'), 'POST', `${base}/orders/o1/fulfill`));

  it('deleteOrder -> DELETE /Materials/orders/{id}', () =>
    expectContract('deleteOrder', () => service.deleteOrder('o1'), 'DELETE', `${base}/orders/o1`));

  // ---------------- Assignments ----------------
  it('getAssignments -> GET /Materials/assignments', () =>
    expectContract('getAssignments', () => service.getAssignments(), 'GET', `${base}/assignments`));

  it('getAssignment -> GET /Materials/assignments/{id}', () =>
    expectContract('getAssignment', () => service.getAssignment('a1'), 'GET', `${base}/assignments/a1`));

  it('issueMaterial -> POST /Materials/assignments', () =>
    expectContract('issueMaterial', () => service.issueMaterial({} as any), 'POST', `${base}/assignments`));

  it('returnMaterial -> POST /Materials/assignments/{id}/return', () =>
    expectContract('returnMaterial', () => service.returnMaterial('a1', {} as any), 'POST', `${base}/assignments/a1/return`));

  it('deleteAssignment -> DELETE /Materials/assignments/{id}', () =>
    expectContract('deleteAssignment', () => service.deleteAssignment('a1'), 'DELETE', `${base}/assignments/a1`));

  // ---------------- Lookup ----------------
  it('lookupByCode -> GET /Materials/lookup', () =>
    expectContract('lookupByCode', () => service.lookupByCode('SKU-1'), 'GET', `${base}/lookup`));

  // ---------------- Stock + ledger ----------------
  it('getStock -> GET /Materials/stock', () =>
    expectContract('getStock', () => service.getStock(), 'GET', `${base}/stock`));

  it('getTransactions -> GET /Materials/transactions', () =>
    expectContract('getTransactions', () => service.getTransactions(), 'GET', `${base}/transactions`));

  it('adjustStock -> POST /Materials/stock/adjust', () =>
    expectContract('adjustStock', () => service.adjustStock({} as any), 'POST', `${base}/stock/adjust`));

  // ---------------- Transfers ----------------
  it('getTransfers -> GET /Materials/transfers', () =>
    expectContract('getTransfers', () => service.getTransfers(), 'GET', `${base}/transfers`));

  it('createTransfer -> POST /Materials/transfers', () =>
    expectContract('createTransfer', () => service.createTransfer({} as any), 'POST', `${base}/transfers`));

  it('completeTransfer -> POST /Materials/transfers/{id}/complete', () =>
    expectContract('completeTransfer', () => service.completeTransfer('t1'), 'POST', `${base}/transfers/t1/complete`));

  it('deleteTransfer -> DELETE /Materials/transfers/{id}', () =>
    expectContract('deleteTransfer', () => service.deleteTransfer('t1'), 'DELETE', `${base}/transfers/t1`));

  // ---------------- Assets ----------------
  it('getAssets -> GET /Materials/assets', () =>
    expectContract('getAssets', () => service.getAssets(), 'GET', `${base}/assets`));

  it('saveAsset (new) -> POST /Materials/assets', () =>
    expectContract('saveAsset(new)', () => service.saveAsset({} as any), 'POST', `${base}/assets`));

  it('saveAsset (existing) -> PUT /Materials/assets/{id}', () =>
    expectContract('saveAsset(existing)', () => service.saveAsset({ id: 'as1' } as any), 'PUT', `${base}/assets/as1`));

  it('deleteAsset -> DELETE /Materials/assets/{id}', () =>
    expectContract('deleteAsset', () => service.deleteAsset('as1'), 'DELETE', `${base}/assets/as1`));

  // ---------------- Reconciliation / cycle counts ----------------
  it('getCounts -> GET /Materials/counts', () =>
    expectContract('getCounts', () => service.getCounts(), 'GET', `${base}/counts`));

  it('getCount -> GET /Materials/counts/{id}', () =>
    expectContract('getCount', () => service.getCount('c1'), 'GET', `${base}/counts/c1`));

  it('createCount -> POST /Materials/counts', () =>
    expectContract('createCount', () => service.createCount({} as any), 'POST', `${base}/counts`));

  it('saveCountLines -> PUT /Materials/counts/{id}/lines', () =>
    expectContract('saveCountLines', () => service.saveCountLines('c1', []), 'PUT', `${base}/counts/c1/lines`));

  it('postCount -> POST /Materials/counts/{id}/post', () =>
    expectContract('postCount', () => service.postCount('c1'), 'POST', `${base}/counts/c1/post`));

  // ---------------- Reporting ----------------
  it('getStockReport -> GET /Materials/reports/stock', () =>
    expectContract('getStockReport', () => service.getStockReport(), 'GET', `${base}/reports/stock`));

  it('getTechnicianBalances -> GET /Materials/reports/technician-balances', () =>
    expectContract('getTechnicianBalances', () => service.getTechnicianBalances(), 'GET', `${base}/reports/technician-balances`));
});
