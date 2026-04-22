package service

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

// StudyTrackURL is the base URL of the studytrack service.
// It is read from the STUDYTRACK_URL environment variable and
// defaults to http://localhost:3333 (local dev default).
func studyTrackBaseURL() string {
	if u := os.Getenv("STUDYTRACK_URL"); u != "" {
		return u
	}
	return "http://localhost:3333"
}

// studyTrackClient is a lightweight HTTP client for the studytrack API.
type studyTrackClient struct {
	http    *http.Client
	baseURL string
}

func newStudyTrackClient() *studyTrackClient {
	return &studyTrackClient{
		http:    &http.Client{Timeout: 5 * time.Second},
		baseURL: studyTrackBaseURL(),
	}
}

// trackResponse mirrors the JSON returned by GET /api/tracks/:id.
type trackResponse struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	ExamDate    string `json:"examDate"`
	Type        string `json:"type"`
	StudyGoal   string `json:"studyGoal"`
	Description string `json:"description"`
}

// ValidateTrack confirms that a StudyTrack objective with the given ID exists.
// Returns nil on success, a descriptive error on failure or if the service is
// unreachable.
func (c *studyTrackClient) ValidateTrack(trackID string) (*trackResponse, error) {
	url := fmt.Sprintf("%s/api/tracks/%s", c.baseURL, trackID)
	resp, err := c.http.Get(url) //nolint:noctx
	if err != nil {
		return nil, fmt.Errorf("studytrack unreachable at %s: %w", c.baseURL, err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode == http.StatusNotFound {
		return nil, fmt.Errorf("studytrack: track %q not found", trackID)
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("studytrack: unexpected status %d: %s", resp.StatusCode, string(body))
	}

	var track trackResponse
	if err := json.Unmarshal(body, &track); err != nil {
		return nil, fmt.Errorf("studytrack: invalid response: %w", err)
	}
	return &track, nil
}
