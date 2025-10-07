import { expect, test, type Page, type Route, type Request } from '@playwright/test';

const API = 'http://localhost:3333/api';

function setupHostRoutes(page: Page) {
  page.route(`${API}/session`, (route: Route) => {
    route.fulfill({ json: { userId: 'host-1', displayName: 'HostLion' } });
  });
  page.route(`${API}/rooms`, (route: Route) => route.fulfill({ status: 404 }));
  page.route(`${API}/rooms/join`, (route: Route) => {
    route.fulfill({
      json: {
        roomId: 'room-1',
        role: 'HOST',
        settings: { allowGuestEnqueue: true, allowGuestSkipVote: false }
      }
    });
  });
  page.route(`${API}/rooms/room-1`, (route: Route) => {
    route.fulfill({
      json: {
        roomId: 'room-1',
        code: 'ABCDEF',
        hostUserId: 'host-1',
        members: [
          { userId: 'host-1', displayName: 'HostLion', role: 'HOST', joinedAt: new Date().toISOString() }
        ],
        settings: { allowGuestEnqueue: true, allowGuestSkipVote: false }
      }
    });
  });
  page.route(`${API}/rooms/room-1/queue`, (route: Route, request: Request) => {
    if (request.method() === 'GET') {
      route.fulfill({ json: [] });
    } else {
      route.fulfill({ json: { id: 'item-1', roomId: 'room-1', videoId: 'vid', title: 'Track', durationSeconds: 200, addedById: 'host-1', position: 0, played: false } });
    }
  });
  page.route(`${API}/rooms/room-1/playback`, (route: Route) => {
    route.fulfill({ json: { roomId: 'room-1', videoId: null, isPlaying: false, positionMs: 0, playbackRate: 1, updatedAt: new Date().toISOString() } });
  });
  page.route(`${API}/search`, (route: Route) => {
    route.fulfill({
      json: {
        items: [
          {
            videoId: 'vid123',
            title: 'Sample Song',
            channelTitle: 'PlayAll',
            thumbnailUrl: 'https://example.com/thumb.jpg',
            durationSeconds: 180
          }
        ]
      }
    });
  });
  page.route(`${API}/rooms/room-1/settings`, (route: Route) => {
    route.fulfill({ json: { allowGuestEnqueue: false, allowGuestSkipVote: false } });
  });
}

test('host toggles guest permission and enqueues track', async ({ page }) => {
  setupHostRoutes(page);
  await page.goto('/r/ABCDEF?roomId=room-1');
  await expect(page.getByText('Sala ABCDEF')).toBeVisible();
  const toggle = page.locator('input[type="checkbox"]');
  await expect(toggle).toBeChecked();
  await toggle.click();
  await expect(toggle).not.toBeChecked();
  await page.fill('input[placeholder="Buscar canciones"]', 'Sample');
  await page.click('button:has-text("Buscar")');
  await expect(page.getByText('Sample Song')).toBeVisible();
  await page.click('button:has-text("Agregar")');
  await expect(page.getByText('Sample Song')).toBeVisible();
});

test('guest sees enqueue disabled message', async ({ page }) => {
  await page.route(`${API}/session`, (route) => route.fulfill({ json: { userId: 'guest-1', displayName: 'GuestFox' } }));
  await page.route(`${API}/rooms/join`, (route) =>
    route.fulfill({
      json: {
        roomId: 'room-1',
        role: 'GUEST',
        settings: { allowGuestEnqueue: false, allowGuestSkipVote: false }
      }
    })
  );
  await page.route(`${API}/rooms/room-1`, (route) =>
    route.fulfill({
      json: {
        roomId: 'room-1',
        code: 'ABCDEF',
        hostUserId: 'host-1',
        members: [],
        settings: { allowGuestEnqueue: false }
      }
    })
  );
  await page.route(`${API}/rooms/room-1/queue`, (route, request) => {
    if (request.method() === 'GET') {
      route.fulfill({ json: [] });
    } else {
      route.fulfill({ json: {} });
    }
  });
  await page.route(`${API}/rooms/room-1/playback`, (route) =>
    route.fulfill({ json: { roomId: 'room-1', videoId: null, isPlaying: false, positionMs: 0, playbackRate: 1, updatedAt: new Date().toISOString() } })
  );
  await page.route(`${API}/search`, (route) =>
    route.fulfill({
      json: {
        items: [
          {
            videoId: 'vid123',
            title: 'Sample Song',
            channelTitle: 'PlayAll',
            thumbnailUrl: 'https://example.com/thumb.jpg',
            durationSeconds: 180
          }
        ]
      }
    })
  );

  await page.goto('/r/ABCDEF?roomId=room-1');
  await expect(page.getByText('El anfitrión ha bloqueado que los invitados encolen canciones.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Agregar' })).toBeDisabled();
});
