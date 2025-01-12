async function sendDJ(data) {
	try {
		const response = await fetch("http://localhost:3000/users", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(data),
		});

		const result = await response.json();
		console.log("Response:", result);
		return result;
	} catch (error) {
		console.error("Error:", error);
		throw error;
	}
}
