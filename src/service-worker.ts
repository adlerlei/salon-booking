/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

const sw = self as unknown as ServiceWorkerGlobalScope;

sw.addEventListener('push', (event) => {
	let title = 'Jo造型髮藝';
	let body = '有新的預約通知';
	let url = '/admin';

	try {
		const data = event.data?.json() as {
			title?: string;
			body?: string;
			url?: string;
			text?: string;
		};
		if (data?.title) title = data.title;
		if (data?.body) body = data.body;
		else if (data?.text) body = data.text.split('\n').slice(0, 3).join('　');
		if (data?.url) url = data.url;
	} catch {
		const text = event.data?.text();
		if (text) body = text;
	}

	event.waitUntil(
		sw.registration.showNotification(title, {
			body,
			data: { url },
			badge: '/favicon.svg',
			icon: '/favicon.svg'
		})
	);
});

sw.addEventListener('notificationclick', (event) => {
	event.notification.close();
	const targetUrl = (event.notification.data && event.notification.data.url) || '/admin';

	event.waitUntil(
		sw.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
			for (const client of clients) {
				if ('focus' in client) {
					client.navigate(targetUrl);
					return client.focus();
				}
			}
			return sw.clients.openWindow(targetUrl);
		})
	);
});
