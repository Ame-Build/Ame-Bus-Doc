// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightThemeFlexoki from 'starlight-theme-flexoki'

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: 'Ame Bus',
			social: {
				github: 'https://github.com/Ame-Build/ame-bus',
			},
			sidebar: [
				{
					label: 'Introduction',
					items: [
						'introduction/welcome',
						'introduction/what_is_nats',
						'introduction/what_is_ame_bus',
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
					label: 'Design Patterns',
					autogenerate: {directory: 'design_patterns'}
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
							link: 'https://docs.rs/ame-bus/latest/ame_bus/'
						}
					]
				}
			],
			plugins: [starlightThemeFlexoki()],
		}),
	],
});
