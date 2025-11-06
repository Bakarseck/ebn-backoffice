/** @type {import('next').NextConfig} */
const nextConfig = {
	// Silence workspace root warning when multiple lockfiles exist on the system
	outputFileTracingRoot: __dirname,
}

module.exports = nextConfig

