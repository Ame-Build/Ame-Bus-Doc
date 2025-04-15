// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightThemeFlexoki from 'starlight-theme-flexoki'

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: 'Shizuku',
			social: {
				github: 'https://github.com/suitsu31-club/shizuku',
			},
			sidebar: [
				{
					label: 'Introduction',
					items: [
						'introduction/welcome',
						'introduction/before_you_start',
						'introduction/what_is_nats',
						'introduction/what_is_shizuku',
						'introduction/install',
					]
				},
				{
					label: 'Core Concepts',
					items: [
						'core_concepts/processor',
						'core_concepts/layer',
						'core_concepts/subject_path',
						'core_concepts/service',
						'core_concepts/consumer',
						'core_concepts/error',
						'core_concepts/kv_store',
					]
				},
				{
					label: 'Best Practices',
					autogenerate: {directory: 'best_practice'}
				},
				{
					label: 'Integration',
					autogenerate: {directory: 'integration'}
				},
				{
					label: 'API Reference',
					items: [
						{
							label: 'docs.rs',
							link: 'https://docs.rs/shizuku/latest/shizuku/'
						}
					]
				}
			],
			plugins: [starlightThemeFlexoki({
				accentColor: "blue"
			})],
		}),
	],
});
