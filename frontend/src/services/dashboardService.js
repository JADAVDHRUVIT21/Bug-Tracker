
import api from "./api";

const dashboardService = {
  getStatistics: async () => {
    // Fetch accessible projects and the first page of tickets.
    const [projectsResponse, firstTicketsResponse] = await Promise.all([
      api.get("/projects/"),
      api.get("/tickets/", {
        params: {
          page: 1,
          page_size: 100,
        },
      }),
    ]);

    const projects = projectsResponse.data;
    const firstPage = firstTicketsResponse.data;

    // Fetch remaining ticket pages if there are more than 100 tickets.
    const remainingPages = [];

    for (let page = 2; page <= firstPage.total_pages; page++) {
      remainingPages.push(
        api.get("/tickets/", {
          params: {
            page,
            page_size: 100,
          },
        })
      );
    }

    const remainingResponses = await Promise.all(remainingPages);

    const tickets = [
      ...firstPage.items,
      ...remainingResponses.flatMap((response) => response.data.items),
    ];

    return {
      totalProjects: projects.length,
      totalTickets: firstPage.total,
      inProgress: tickets.filter(
        (ticket) => ticket.status === "in_progress"
      ).length,
      completed: tickets.filter(
        (ticket) => ticket.status === "done"
      ).length,
    };
  },
};

export default dashboardService;