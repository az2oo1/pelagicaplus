package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"os"
	"path"
	"pelagica-backend/models"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
)

func getSeerrUrl() (string, error) {
	path := os.Getenv("CONFIG_PATH")
	if path == "" {
		path = "config.json"
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	var cfg models.AppConfig
	if err := json.Unmarshal(data, &cfg); err != nil {
		return "", err
	}
	return cfg.SeerrUrl, nil
}

func ProxySeerrRequest(c fiber.Ctx) error {
	seerrUrl, err := getSeerrUrl()
	if err != nil || seerrUrl == "" {
		return c.Status(fiber.StatusBadRequest).JSON(models.APIError{Error: "Seerr is not configured"})
	}

	wildcardPath := c.Params("*")
	method := c.Method()
	bodyBytes := c.Body()

	username := c.Get("X-Seerr-Username")
	password := c.Get("X-Seerr-Password")

	jar, _ := cookiejar.New(nil)
	client := &http.Client{
		Jar:     jar,
		Timeout: 15 * time.Second,
	}

	// Helper function to execute request
	executeRequest := func() (*http.Response, error) {
		u, err := url.Parse(seerrUrl)
		if err != nil {
			return nil, err
		}

		u.Path = path.Join(u.Path, "api/v1", wildcardPath)

		// Re-encode all query parameters to be 100% safe (escapes spaces, special characters, etc.)
		queryParams := url.Values{}
		for k, v := range c.Queries() {
			queryParams.Set(k, v)
		}
		u.RawQuery = strings.ReplaceAll(queryParams.Encode(), "+", "%20")

		targetUrl := u.String()

		var bodyReader io.Reader
		if len(bodyBytes) > 0 {
			bodyReader = bytes.NewReader(bodyBytes)
		}

		req, err := http.NewRequest(method, targetUrl, bodyReader)
		if err != nil {
			return nil, err
		}

		// Set headers
		if len(bodyBytes) > 0 {
			req.Header.Set("Content-Type", "application/json")
		}

		return client.Do(req)
	}

	// 1. Try request
	resp, err := executeRequest()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.APIError{Error: fmt.Sprintf("Failed to contact Seerr: %v", err)})
	}
	defer resp.Body.Close()

	// 2. Login & retry on 401/403
	if (resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden) && username != "" && password != "" {
		loginUrl := fmt.Sprintf("%s/api/v1/auth/jellyfin", seerrUrl)
		loginBody, _ := json.Marshal(map[string]string{
			"username": username,
			"password": password,
		})

		loginReq, err := http.NewRequest("POST", loginUrl, bytes.NewBuffer(loginBody))
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(models.APIError{Error: "Failed to create login request"})
		}
		loginReq.Header.Set("Content-Type", "application/json")

		loginResp, err := client.Do(loginReq)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(models.APIError{Error: fmt.Sprintf("Login request failed: %v", err)})
		}
		loginResp.Body.Close()

		if loginResp.StatusCode == http.StatusOK {
			// Retry request
			resp2, err := executeRequest()
			if err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(models.APIError{Error: fmt.Sprintf("Failed to contact Seerr after login: %v", err)})
			}
			defer resp2.Body.Close()

			body, _ := io.ReadAll(resp2.Body)
			c.Status(resp2.StatusCode)
			c.Set("Content-Type", "application/json")
			return c.Send(body)
		} else {
			return c.Status(loginResp.StatusCode).JSON(models.APIError{Error: fmt.Sprintf("Seerr login failed: status %d", loginResp.StatusCode)})
		}
	}

	body, _ := io.ReadAll(resp.Body)
	c.Status(resp.StatusCode)
	c.Set("Content-Type", "application/json")
	return c.Send(body)
}
